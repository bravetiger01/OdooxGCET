"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/Card';
import Modal from '@/components/Modal';
import LoadingSpinner from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import { employeeAPI } from '@/lib/api';
import { exportToCSV } from '@/lib/utils';
import { useApp } from '@/context/AppContext';
import { motion } from 'framer-motion';

export default function EmployeesPage() {
  const router = useRouter();
  const { showToast, hasPermission, user } = useApp();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    phone: '',
    department: '',
    job_position: '',
    role: 'employee',
    date_of_joining: new Date().toISOString().split('T')[0],
  });

  // If employee role, redirect to their own profile
  useEffect(() => {
    if (user?.role === 'Employee' && user?.empId) {
      router.push(`/employees/${user.empId}`);
    }
  }, [user, router]);

  // Fetch employees
  useEffect(() => {
    if (user) {
      fetchEmployees();
    }
  }, [user]);

  const fetchEmployees = async () => {
    // Fallback to company_id = 1 if not available (for old sessions)
    const companyId = user?.companyId || 1;
    
    setLoading(true);
    console.log('Fetching employees for company:', companyId);
    
    try {
      const result = await employeeAPI.getAll(companyId);
      
      console.log('Employee fetch result:', result);
      
      if (result.success) {
        setEmployees(result.employees);
      } else {
        showToast(result.error || 'Failed to load employees', 'error');
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      showToast('Failed to load employees', 'error');
    }
    
    setLoading(false);
  };

  // Get unique departments from employees
  const departments = [...new Set(employees.map(emp => emp.department).filter(Boolean))];

  const filteredEmployees = employees.filter(emp => {
    const fullName = `${emp.first_name} ${emp.last_name}`.toLowerCase();
    const matchesSearch = fullName.includes(searchTerm.toLowerCase()) ||
                         emp.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         emp.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = !filterDept || emp.department === filterDept;
    return matchesSearch && matchesDept;
  });

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    
    if (!user?.empId) {
      showToast('User session invalid. Please login again.', 'error');
      return;
    }

    setSubmitting(true);

    const employeeData = {
      admin_user_id: user.empId, // Backend will get company_id from this admin user
      email: formData.email,
      password: formData.password,
      first_name: formData.first_name,
      last_name: formData.last_name,
      role: formData.role,
      year_of_joining: new Date().getFullYear(),
      phone: formData.phone,
      department: formData.department,
      job_position: formData.job_position,
      date_of_joining: formData.date_of_joining,
    };

    const result = await employeeAPI.add(employeeData);

    if (result.success) {
      showToast('Employee added successfully!', 'success');
      setShowAddModal(false);
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        phone: '',
        department: '',
        job_position: '',
        role: 'employee',
        date_of_joining: new Date().toISOString().split('T')[0],
      });
      fetchEmployees(); // Refresh the list
    } else {
      showToast(result.error || 'Failed to add employee', 'error');
    }

    setSubmitting(false);
  };

  const handleExport = () => {
    const exportData = filteredEmployees.map(emp => ({
      'Employee ID': emp.id,
      'Name': `${emp.first_name} ${emp.last_name}`,
      'Email': emp.email,
      'Phone': emp.phone || '',
      'Department': emp.department || '',
      'Position': emp.job_position || '',
      'Role': emp.role,
      'Status': emp.is_active ? 'Active' : 'Inactive',
      'Join Date': emp.date_of_joining ? new Date(emp.date_of_joining).toLocaleDateString() : '',
    }));
    exportToCSV(exportData, 'employees');
    showToast('Employees exported successfully!', 'success');
  };

  if (loading) {
    return <LoadingSpinner size="lg" message="Loading employees..." />;
  }

  return (
    <div className="space-y-6">
      {hasPermission('add_employee') && (
        <motion.div
          className="flex justify-end"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-medium px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all"
          >
            + Add Employee
          </button>
        </motion.div>
      )}

      <Card className="p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <input
            type="text"
            placeholder="Search by name, ID, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-600"
          />
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-600"
          >
            <option value="">All Departments</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
          <button
            onClick={handleExport}
            className="bg-cyan-50 hover:bg-cyan-700 text-gray-900 font-medium px-6 py-2 rounded-lg transition-colors"
          >
            Export CSV
          </button>
        </div>

        {filteredEmployees.length === 0 ? (
          <EmptyState
            icon={employees.length === 0 ? '👥' : '🔍'}
            title={employees.length === 0 ? 'No Employees Yet' : 'No Employees Found'}
            description={
              employees.length === 0 
                ? 'Get started by adding your first employee to the system.'
                : 'Try adjusting your search or filter criteria.'
            }
            action={employees.length === 0 && hasPermission('add_employee') ? '+ Add First Employee' : null}
            onAction={employees.length === 0 && hasPermission('add_employee') ? () => setShowAddModal(true) : null}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEmployees.map((employee, index) => (
              <motion.div
                key={employee.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
                whileHover={{ y: -8, transition: { duration: 0.2 } }}
                onClick={() => router.push(`/employees/${employee.id}`)}
                className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-2xl hover:border-cyan-200 transition-all cursor-pointer group"
              >
                {/* Profile Picture / Avatar */}
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-xl font-semibold flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform">
                    {employee.first_name?.charAt(0)}{employee.last_name?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 truncate group-hover:text-cyan-600 transition-colors">
                      {employee.first_name} {employee.last_name}
                    </h3>
                    <p className="text-sm text-gray-500 truncate">{employee.email}</p>
                    <span className={`inline-block mt-1 px-2 py-1 rounded-full text-xs font-medium ${
                      employee.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {employee.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                {/* Employee Details */}
                <div className="space-y-2 border-t border-gray-100 pt-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Employee ID:</span>
                    <span className="font-medium text-gray-900">{employee.id}</span>
                  </div>
                  
                  {employee.department && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Department:</span>
                      <span className="font-medium text-gray-900">{employee.department}</span>
                    </div>
                  )}
                  
                  {employee.job_position && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Position:</span>
                      <span className="font-medium text-gray-900 truncate ml-2">{employee.job_position}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Role:</span>
                    <span className="font-medium text-gray-900">
                      {employee.role === 'admin' ? 'Admin' : 
                       employee.role === 'hr_officer' ? 'HR Officer' :
                       employee.role === 'payroll_officer' ? 'Payroll Officer' : 'Employee'}
                    </span>
                  </div>
                  
                  {employee.date_of_joining && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Joined:</span>
                      <span className="font-medium text-gray-900">
                        {new Date(employee.date_of_joining).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  
                  {employee.phone && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Phone:</span>
                      <span className="font-medium text-gray-900">{employee.phone}</span>
                    </div>
                  )}
                </div>

                {/* Action Button */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/employees/${employee.id}`);
                    }}
                    className="w-full text-center text-cyan-600 hover:text-cyan-700 font-medium text-sm group-hover:translate-x-1 transition-transform"
                  >
                    {hasPermission('edit_employee') ? 'View Details →' : 'View Profile →'}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </Card>

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add New Employee" size="lg">
        <form onSubmit={handleAddEmployee} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
              <input
                type="text"
                required
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
              <input
                type="text"
                required
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-600"
                placeholder="Min. 6 characters"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-600"
                placeholder="e.g., Engineering, HR, Sales"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Job Position</label>
              <input
                type="text"
                value={formData.job_position}
                onChange={(e) => setFormData({ ...formData, job_position: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-600"
                placeholder="e.g., Software Engineer, Manager"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
              <select
                required
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-600"
              >
                <option value="employee">Employee</option>
                <option value="hr_officer">HR Officer</option>
                <option value="payroll_officer">Payroll Officer</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date of Joining</label>
              <input
                type="date"
                value={formData.date_of_joining}
                onChange={(e) => setFormData({ ...formData, date_of_joining: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-600"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              disabled={submitting}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg disabled:opacity-50"
            >
              {submitting ? 'Adding...' : 'Add Employee'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
