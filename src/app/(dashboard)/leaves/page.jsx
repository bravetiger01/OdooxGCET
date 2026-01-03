"use client";

import { useState, useEffect } from 'react';
import Card from '@/components/Card';
import Modal from '@/components/Modal';
import LoadingSpinner from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import { leaveAPI } from '@/lib/api';
import { useApp } from '@/context/AppContext';
import { motion } from 'framer-motion';

export default function LeavesPage() {
  const { showToast, hasPermission, user } = useApp();
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [leaveAllocations, setLeaveAllocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  
  const [formData, setFormData] = useState({
    leave_type_id: '',
    start_date: '',
    end_date: '',
    reason: '',
  });

  const canApprove = hasPermission('approve_leaves');
  const isEmployee = user?.role === 'Employee';

  // Debug: Log user and leaveTypes whenever they change
  useEffect(() => {
    console.log('👤 Current user:', user);
    console.log('📋 Current leaveTypes:', leaveTypes);
  }, [user, leaveTypes]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, filterStatus]);

  const fetchData = async () => {
    const companyId = user?.companyId || 1;
    const userId = isEmployee ? user?.empId : undefined;
    
    console.log('🔍 Fetching leave data for company:', companyId);
    console.log('🔍 User:', user);
    
    setLoading(true);
    
    // Fetch leave types
    const typesResult = await leaveAPI.getLeaveTypes(companyId);
    console.log('📊 Leave types result:', typesResult);
    if (typesResult.success) {
      console.log('✅ Setting leave types:', typesResult.leaveTypes);
      setLeaveTypes(typesResult.leaveTypes);
    } else {
      console.error('❌ Failed to fetch leave types:', typesResult.error);
    }
    
    // Fetch leave allocations (for current user)
    if (user?.empId) {
      const allocResult = await leaveAPI.getLeaveAllocations(user.empId);
      if (allocResult.success) {
        setLeaveAllocations(allocResult.allocations);
      }
    }
    
    // Fetch leave requests
    const requestsResult = await leaveAPI.getLeaveRequests(companyId, userId, filterStatus);
    if (requestsResult.success) {
      setLeaveRequests(requestsResult.requests);
    } else {
      showToast(requestsResult.error || 'Failed to load leave requests', 'error');
    }
    
    setLoading(false);
  };

  const calculateDays = (start, end) => {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    
    const totalDays = calculateDays(formData.start_date, formData.end_date);
    
    const leaveData = {
      user_id: user?.empId,
      company_id: user?.companyId || 1,
      leave_type_id: parseInt(formData.leave_type_id),
      start_date: formData.start_date,
      end_date: formData.end_date,
      total_days: totalDays,
      reason: formData.reason,
    };

    const result = await leaveAPI.applyLeave(leaveData);
    
    if (result.success) {
      showToast('Leave request submitted successfully!', 'success');
      setShowApplyModal(false);
      setFormData({
        leave_type_id: '',
        start_date: '',
        end_date: '',
        reason: '',
      });
      fetchData();
    } else {
      showToast(result.error || 'Failed to apply leave', 'error');
    }
  };

  const handleApprove = async (id) => {
    const result = await leaveAPI.updateLeaveStatus(
      id,
      'approved',
      user?.empId,
      user?.companyId || 1
    );
    
    if (result.success) {
      showToast('Leave request approved!', 'success');
      fetchData();
    } else {
      showToast(result.error || 'Failed to approve leave', 'error');
    }
  };

  const handleReject = async (id) => {
    const result = await leaveAPI.updateLeaveStatus(
      id,
      'rejected',
      user?.empId,
      user?.companyId || 1
    );
    
    if (result.success) {
      showToast('Leave request rejected', 'info');
      fetchData();
    } else {
      showToast(result.error || 'Failed to reject leave', 'error');
    }
  };

  const handleCancel = async (id) => {
    if (!confirm('Are you sure you want to cancel this leave request?')) return;
    
    const result = await leaveAPI.cancelLeaveRequest(
      id,
      user?.empId,
      user?.companyId || 1
    );
    
    if (result.success) {
      showToast('Leave request cancelled', 'info');
      fetchData();
    } else {
      showToast(result.error || 'Failed to cancel leave', 'error');
    }
  };

  if (loading) {
    return <LoadingSpinner size="lg" message="Loading leaves..." />;
  }

  return (
    <div className="space-y-6">
      {/* Leave Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {leaveAllocations.map((allocation, index) => (
          <motion.div
            key={allocation.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="p-6 hover:shadow-xl transition-shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {allocation.leave_type_name}
              </h3>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                  {allocation.total_days - allocation.used_days}
                </span>
                <span className="text-gray-600">/ {allocation.total_days} days</span>
              </div>
              <div className="mt-2 text-sm text-gray-500">
                Used: {allocation.used_days} days
              </div>
              {/* Progress bar */}
              <div className="mt-3 w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${(allocation.used_days / allocation.total_days) * 100}%` }}
                  transition={{ duration: 1, delay: index * 0.1 + 0.3 }}
                />
              </div>
              {allocation.is_paid && (
                <span className="inline-block mt-3 px-3 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
                  💰 Paid Leave
                </span>
              )}
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Apply Leave Button */}
      {hasPermission('apply_leave') && (
        <motion.div
          className="flex justify-end gap-3"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <button
            onClick={() => setShowApplyModal(true)}
            className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-medium px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all"
          >
            + Apply for Leave
          </button>
        </motion.div>
      )}

      {/* Leave Requests */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Leave Requests</h2>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F2BED1]"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {leaveRequests.length === 0 ? (
          <EmptyState
            icon="🏖️"
            title="No Leave Requests"
            description="No leave requests found. Apply for leave to see them here."
          />
        ) : (
          <div className="space-y-4">
            {leaveRequests.map((request) => (
              <div
                key={request.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-[#F2BED1] transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">
                        {request.first_name} {request.last_name}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        request.status === 'approved' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </span>
                      {request.is_paid && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          Paid
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Type:</span>
                        <p className="font-medium">{request.leave_type_name}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">From:</span>
                        <p className="font-medium">{new Date(request.start_date).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">To:</span>
                        <p className="font-medium">{new Date(request.end_date).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Days:</span>
                        <p className="font-medium">{request.total_days}</p>
                      </div>
                    </div>
                    {request.reason && (
                      <div className="mt-2 text-sm">
                        <span className="text-gray-500">Reason:</span>
                        <p className="text-gray-700">{request.reason}</p>
                      </div>
                    )}
                    {request.approved_by && (
                      <div className="mt-2 text-xs text-gray-500">
                        {request.status === 'approved' ? 'Approved' : 'Rejected'} by {request.approver_first_name} {request.approver_last_name}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    {request.status === 'pending' && canApprove && request.user_id !== user?.empId && (
                      <>
                        <button
                          onClick={() => handleApprove(request.id)}
                          className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm rounded-lg transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(request.id)}
                          className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg transition-colors"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {request.status === 'pending' && request.user_id === user?.empId && (
                      <button
                        onClick={() => handleCancel(request.id)}
                        className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Apply Leave Modal */}
      <Modal isOpen={showApplyModal} onClose={() => {
        console.log('🔍 Modal closing, leaveTypes:', leaveTypes);
        setShowApplyModal(false);
      }} title="Apply for Leave">
        <form onSubmit={handleApplyLeave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type *</label>
            <select
              required
              value={formData.leave_type_id}
              onChange={(e) => {
                console.log('🔍 Selected leave type:', e.target.value);
                setFormData({ ...formData, leave_type_id: e.target.value });
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F2BED1]"
            >
              <option value="">Select Leave Type</option>
              {console.log('🔍 Rendering leave types in dropdown:', leaveTypes)}
              {leaveTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name} {type.is_paid ? '(Paid)' : '(Unpaid)'}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
              <input
                type="date"
                required
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F2BED1]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
              <input
                type="date"
                required
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F2BED1]"
              />
            </div>
          </div>
          {formData.start_date && formData.end_date && (
            <div className="text-sm text-gray-600">
              Total Days: <span className="font-semibold">{calculateDays(formData.start_date, formData.end_date)}</span>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
            <textarea
              required
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F2BED1]"
              placeholder="Please provide a reason for your leave..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setShowApplyModal(false)}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-[#F2BED1] hover:bg-[#FDCEDF] text-white rounded-lg"
            >
              Submit Request
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
