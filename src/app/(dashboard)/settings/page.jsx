"use client";

import { useState, useEffect } from 'react';
import Card from '@/components/Card';
import Tabs from '@/components/Tabs';
import DataTable from '@/components/DataTable';
import LoadingSpinner from '@/components/LoadingSpinner';
import { salaryAPI, leaveAPI, companyAPI } from '@/lib/api';
import { useApp } from '@/context/AppContext';

export default function SettingsPage() {
  const { showToast, user } = useApp();
  const [activeTab, setActiveTab] = useState('company');
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  
  // Company settings state
  const [companyData, setCompanyData] = useState({
    company_name: '',
    company_code: '',
    company_logo: '',
  });
  
  // Leave types state
  const [leaveTypes, setLeaveTypes] = useState([]);
  
  // Payroll settings state with proper defaults
  const [payrollSettings, setPayrollSettings] = useState({
    payroll_pf_rate_employee: 12,
    payroll_pf_rate_employer: 12,
    payroll_professional_tax: 200,
    payroll_working_days_per_week: 5,
    payroll_consider_half_days: true,
    payroll_deduct_absent_days: true,
  });

  useEffect(() => {
    if (user?.companyId) {
      if (activeTab === 'company') {
        fetchCompanyData();
      } else if (activeTab === 'payroll') {
        fetchPayrollSettings();
      } else if (activeTab === 'leave-types') {
        fetchLeaveTypes();
      }
    }
  }, [user, activeTab]);

  const fetchCompanyData = async () => {
    if (!user?.companyId) return;
    
    setDataLoading(true);
    const result = await companyAPI.getCompanyDetails(user.companyId);
    
    if (result.success && result.company) {
      setCompanyData({
        company_name: result.company.company_name || '',
        company_code: result.company.company_code || '',
        company_logo: result.company.company_logo || '',
      });
    } else {
      showToast(result.error || 'Failed to load company data', 'error');
    }
    setDataLoading(false);
  };

  const fetchLeaveTypes = async () => {
    if (!user?.companyId) return;
    
    setDataLoading(true);
    const result = await leaveAPI.getLeaveTypes(user.companyId);
    
    if (result.success) {
      setLeaveTypes(result.leaveTypes || []);
    } else {
      showToast(result.error || 'Failed to load leave types', 'error');
    }
    setDataLoading(false);
  };

  const fetchPayrollSettings = async () => {
    if (!user?.companyId) return;
    
    setDataLoading(true);
    const result = await salaryAPI.getPayrollSettings(user.companyId);
    
    if (result.success) {
      setPayrollSettings({
        payroll_pf_rate_employee: result.settings.payroll_pf_rate_employee ?? 12,
        payroll_pf_rate_employer: result.settings.payroll_pf_rate_employer ?? 12,
        payroll_professional_tax: result.settings.payroll_professional_tax ?? 200,
        payroll_working_days_per_week: result.settings.payroll_working_days_per_week ?? 5,
        payroll_consider_half_days: result.settings.payroll_consider_half_days ?? true,
        payroll_deduct_absent_days: result.settings.payroll_deduct_absent_days ?? true,
      });
    } else {
      showToast(result.error || 'Failed to load payroll settings', 'error');
    }
    setDataLoading(false);
  };

  const handleSavePayrollSettings = async () => {
    if (!user?.companyId || !user?.empId) {
      showToast('User session invalid', 'error');
      return;
    }

    setLoading(true);
    const result = await salaryAPI.updatePayrollSettings(
      user.companyId,
      payrollSettings,
      user.empId
    );

    if (result.success) {
      showToast('Payroll settings saved successfully!', 'success');
    } else {
      showToast(result.error || 'Failed to save payroll settings', 'error');
    }
    setLoading(false);
  };

  const tabs = [
    { id: 'company', label: 'Company' },
    { id: 'payroll', label: 'Payroll Settings' },
    { id: 'leave-types', label: 'Leave Types' },
  ];

  const leaveTypeColumns = [
    { key: 'name', label: 'Leave Type', sortable: true },
    { 
      key: 'max_days', 
      label: 'Max Days', 
      sortable: true,
      render: (row) => row.max_days || 'Unlimited'
    },
    {
      key: 'is_paid',
      label: 'Paid',
      render: (row) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          row.is_paid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {row.is_paid ? 'Yes' : 'No'}
        </span>
      ),
    },
    {
      key: 'description',
      label: 'Description',
      render: (row) => row.description || 'N/A',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
          Settings
        </h1>
        <p className="text-gray-600 mt-1">Manage your company and system settings</p>
      </div>

      <Card className="p-6">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        <div className="mt-6">
          {dataLoading ? (
            <LoadingSpinner size="lg" message="Loading settings..." />
          ) : (
            <>
              {activeTab === 'company' && (
                <div className="max-w-2xl space-y-6">
                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
                    <h4 className="font-semibold text-blue-900 mb-2">ℹ️ Company Information</h4>
                    <p className="text-sm text-blue-800">
                      Your company details are displayed here. Company code cannot be changed once set.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
                    <input
                      type="text"
                      value={companyData.company_name}
                      onChange={(e) => setCompanyData({ ...companyData, company_name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-600"
                      placeholder="Enter company name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Company Code</label>
                    <input
                      type="text"
                      value={companyData.company_code}
                      disabled
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Company code is auto-generated and cannot be changed</p>
                  </div>
                  
                  <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      <strong>Note:</strong> Company update functionality will be available in a future update. Contact support to modify company details.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'payroll' && (
                <div className="max-w-2xl space-y-6">
                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
                    <h4 className="font-semibold text-blue-900 mb-2">ℹ️ About Payroll Settings</h4>
                    <p className="text-sm text-blue-800">
                      These settings apply to all employees during payroll computation. Changes will affect future payroll runs.
                    </p>
                  </div>

                  <h3 className="text-lg font-semibold text-gray-900">Provident Fund (PF) Rates</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Employee PF Contribution (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={payrollSettings.payroll_pf_rate_employee}
                      onChange={(e) => setPayrollSettings({
                        ...payrollSettings,
                        payroll_pf_rate_employee: parseFloat(e.target.value) || 0
                      })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-600"
                      placeholder="12"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Standard rate is 12%. This will be deducted from employee's basic salary.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Employer PF Contribution (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={payrollSettings.payroll_pf_rate_employer}
                      onChange={(e) => setPayrollSettings({
                        ...payrollSettings,
                        payroll_pf_rate_employer: parseFloat(e.target.value) || 0
                      })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-600"
                      placeholder="12"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Standard rate is 12%. This is paid by the employer (not deducted from salary).
                    </p>
                  </div>

                  <h3 className="text-lg font-semibold text-gray-900 mt-8">Tax Deductions</h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Professional Tax (₹)
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={payrollSettings.payroll_professional_tax}
                      onChange={(e) => setPayrollSettings({
                        ...payrollSettings,
                        payroll_professional_tax: parseFloat(e.target.value) || 0
                      })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-600"
                      placeholder="200"
                    />
                    <p className="text-xs text-g00 mt-1">
                      Fixed monthly professional tax amount. Standard is ₹200 per month.
                    </p>
                  </div>

                  <h3 className="text-lg font-semibold text-gray-900 mt-8">Attendance & Working Days</h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Working Days Per Week
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      max="7"
                      value={payrollSettings.payroll_working_days_per_week}
                      onChange={(e) => setPayrollSettings({
                        ...payrollSettings,
                        payroll_working_days_per_week: parseInt(e.target.value) || 5
                      })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-600"
                      placeholder="5"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Number of working days per week. Standard is 5 days (Monday to Friday).
                    </p>
                  </div>

                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={payrollSettings.payroll_consider_half_days}
                        onChange={(e) => setPayrollSettings({
                          ...payrollSettings,
                          payroll_consider_half_days: e.target.checked
                        })}
                        className="w-5 h-5 text-cyan-600 border-gray-300 rounded focus:ring-cyan-600"
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-700">Consider Half Days</div>
                        <div className="text-xs text-gray-500">
                          Half-day attendance will count as 0.5 days in payroll calculation
                        </div>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={payrollSettings.payroll_deduct_absent_days}
                        onChange={(e) => setPayrollSettings({
                          ...payrollSettings,
                          payroll_deduct_absent_days: e.target.checked
                        })}
                        className="w-5 h-5 text-cyan-600 border-gray-300 rounded focus:ring-cyan-600"
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-700">Deduct for Absent Days</div>
                        <div className="text-xs text-gray-500">
                          Salary will be prorated based on actual attendance. Uncheck to pay full salary regardless of attendance.
                        </div>
                      </div>
                    </label>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-3">Example Calculation (Attendance-Based)</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Monthly Salary:</span>
                        <span className="font-medium">₹60,000</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Working Days in Month:</span>
                        <span className="font-medium">22 days</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Days Present:</span>
                        <span className="font-medium text-green-600">20 days</span>
                      </div>
                      {payrollSettings.payroll_consider_half_days && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Half Days:</span>
                          <span className="font-medium text-yellow-600">2 days (= 1 day)</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Paid Days:</span>
                        <span className="font-medium text-blue-600">21 days</span>
                      </div>
                      {payrollSettings.payroll_deduct_absent_days && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Attendance Ratio:</span>
                          <span className="font-medium">21/22 = 95.45%</span>
                        </div>
                      )}
                      <div className="border-t border-gray-300 pt-2 mt-2 flex justify-between">
                        <span className="text-gray-600">Prorated Salary:</span>
                        <span className="font-medium">
                          {payrollSettings.payroll_deduct_absent_days 
                            ? '₹57,273 (95.45% of ₹60,000)' 
                            : '₹60,000 (Full salary)'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Basic (50%):</span>
                        <span className="font-medium">
                          {payrollSettings.payroll_deduct_absent_days ? '₹28,636' : '₹30,000'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Employee PF ({payrollSettings.payroll_pf_rate_employee}%):</span>
                        <span className="font-medium text-red-600">
                          -{payrollSettings.payroll_deduct_absent_days 
                            ? `₹${(28636 * payrollSettings.payroll_pf_rate_employee / 100).toFixed(2)}`
                            : `₹${(30000 * payrollSettings.payroll_pf_rate_employee / 100).toFixed(2)}`}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Professional Tax:</span>
                        <span className="font-medium text-red-600">-₹{payrollSettings.payroll_professional_tax}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleSavePayrollSettings}
                    disabled={loading}
                    className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-medium px-6 py-2 rounded-lg disabled:opacity-50 shadow-lg hover:shadow-xl transition-all"
                  >
                    {loading ? 'Saving...' : 'Save Payroll Settings'}
                  </button>
                </div>
              )}

              {activeTab === 'leave-types' && (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-2">ℹ️ Leave Types</h4>
                    <p className="text-sm text-blue-800">
                      These are the leave types configured for your company. Employees can apply for these leave types.
                    </p>
                  </div>
                  
                  {leaveTypes.length > 0 ? (
                    <DataTable columns={leaveTypeColumns} data={leaveTypes} />
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <p>No leave types configured yet.</p>
                      <p className="text-sm mt-2">Contact your administrator to set up leave types.</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
