"use client";

import { useState, useEffect } from 'react';
import Card from '@/components/Card';
import Stepper from '@/components/Stepper';
import DataTable from '@/components/DataTable';
import LoadingSpinner from '@/components/LoadingSpinner';
import { payrollAPI } from '@/lib/api';
import { formatCurrency, exportToCSV } from '@/lib/utils';
import { useApp } from '@/context/AppContext';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Users, DollarSign, CheckCircle, AlertTriangle, Download, ArrowRight, ArrowLeft } from 'lucide-react';

export default function PayrollRunPage() {
  const { showToast, user } = useApp();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [payrunId, setPayrunId] = useState(null);
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(false);

  const steps = ['Select Month', 'Preview', 'Compute', 'Finalize'];

  useEffect(() => {
    if (currentStep === 1 && payrunId) {
      fetchPayslips();
    }
  }, [currentStep, payrunId]);

  const fetchPayslips = async () => {
    if (!payrunId) return;
    
    setLoading(true);
    const result = await payrollAPI.getPayslipsByPayrun(payrunId);
    
    if (result.success) {
      setPayslips(result.payslips);
    } else {
      showToast(result.error || 'Failed to fetch payslips', 'error');
    }
    setLoading(false);
  };

  const columns = [
    { 
      key: 'employee', 
      label: 'Employee', 
      sortable: true,
      render: (row) => `${row.first_name} ${row.last_name}`
    },
    { key: 'user_id', label: 'Emp ID', sortable: true },
    {
      key: 'attendance',
      label: 'Attendance',
      render: (row) => (
        <div className="text-sm">
          <div className="font-medium">{row.paid_days || 0}/{row.total_working_days || 0} days</div>
          <div className="text-xs text-gray-500">
            {row.total_working_days > 0 
              ? `${((row.paid_days / row.total_working_days) * 100).toFixed(1)}%`
              : '0%'}
          </div>
        </div>
      ),
    },
    {
      key: 'gross_salary',
      label: 'Gross',
      sortable: true,
      render: (row) => formatCurrency(row.gross_salary),
    },
    {
      key: 'total_deductions',
      label: 'Deductions',
      sortable: true,
      render: (row) => formatCurrency(row.total_deductions),
    },
    {
      key: 'net_salary',
      label: 'Net Pay',
      sortable: true,
      render: (row) => <span className="font-semibold">{formatCurrency(row.net_salary)}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          row.status === 'validated' ? 'bg-green-100 text-green-800' : 
          row.status === 'computed' ? 'bg-blue-100 text-blue-800' :
          'bg-yellow-100 text-yellow-800'
        }`}>
          {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
        </span>
      ),
    },
  ];

  const totalGross = payslips.reduce((sum, emp) => sum + parseFloat(emp.gross_salary || 0), 0);
  const totalDeductions = payslips.reduce((sum, emp) => sum + parseFloat(emp.total_deductions || 0), 0);
  const totalNet = payslips.reduce((sum, emp) => sum + parseFloat(emp.net_salary || 0), 0);

  const handleNext = async () => {
    if (currentStep === 0) {
      // Create payrun
      await createPayrun();
    } else if (currentStep === 1) {
      // Compute payroll
      await computePayroll();
    } else if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const createPayrun = async () => {
    const [year, month] = selectedMonth.split('-');
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    const payrunData = {
      company_id: user?.companyId || 1,
      name: `${startDate.toLocaleString('default', { month: 'long' })} ${year} Payroll`,
      pay_period_start: startDate.toISOString().split('T')[0],
      pay_period_end: endDate.toISOString().split('T')[0],
      created_by: user?.empId
    };

    setLoading(true);
    const result = await payrollAPI.createPayrun(payrunData);
    
    if (result.success) {
      setPayrunId(result.payrun_id);
      setCurrentStep(1);
      showToast('Payrun created successfully!', 'success');
    } else {
      showToast(result.error || 'Failed to create payrun', 'error');
    }
    setLoading(false);
  };

  const computePayroll = async () => {
    if (!payrunId) return;

    setLoading(true);
    const result = await payrollAPI.computePayroll(
      payrunId,
      user?.empId,
      user?.companyId || 1
    );
    
    if (result.success) {
      showToast(`Payroll computed for ${result.employee_count} employees!`, 'success');
      await fetchPayslips();
      setCurrentStep(2);
    } else {
      showToast(result.error || 'Failed to compute payroll', 'error');
    }
    setLoading(false);
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinalize = async () => {
    if (!payrunId) return;

    setLoading(true);
    const result = await payrollAPI.validatePayrun(
      payrunId,
      user?.empId,
      user?.companyId || 1
    );
    
    if (result.success) {
      showToast('Payroll finalized successfully!', 'success');
      setTimeout(() => {
        router.push('/payroll/payslips');
      }, 1500);
    } else {
      showToast(result.error || 'Failed to finalize payroll', 'error');
    }
    setLoading(false);
  };

  const handleExport = () => {
    const exportData = payslips.map(p => ({
      employee: `${p.first_name} ${p.last_name}`,
      empId: p.user_id,
      gross: p.gross_salary,
      deductions: p.total_deductions,
      net: p.net_salary,
      status: p.status
    }));
    exportToCSV(exportData, `payroll_${selectedMonth}`);
    showToast('Payroll data exported successfully!', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
            Run Payroll
          </h1>
          <p className="text-gray-600 mt-1">Process monthly payroll in 4 simple steps</p>
        </div>
        {(currentStep === 2 || currentStep === 3) && payslips.length > 0 && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 border-2 border-cyan-200 text-cyan-700 rounded-xl hover:bg-cyan-50 transition-all"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </motion.button>
        )}
      </motion.div>

      <Card className="p-8 bg-gradient-to-br from-white to-gray-50">
        <Stepper steps={steps} currentStep={currentStep} />

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="mt-8"
          >
            {currentStep === 0 && (
              <div className="max-w-2xl mx-auto space-y-6">
                <div className="text-center mb-8">
                  <div className="w-20 h-20 bg-gradient-to-br from-cyan-100 to-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-10 h-10 text-cyan-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Payroll Period</h2>
                  <p className="text-gray-600">Choose the month you want to process payroll for</p>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Payroll Month
                  </label>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all text-lg"
                  />
                </div>

                <div className="bg-gradient-to-br from-cyan-50 to-blue-50 p-6 rounded-2xl border border-cyan-100">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-cyan-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <DollarSign className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-2">Payroll Summary</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Selected Period:</span>
                          <span className="font-semibold text-gray-900">
                            {new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                          </span>
                        </div>
                        <div className="pt-3 border-t border-cyan-200">
                          <p className="text-xs text-gray-600">
                            💡 Click "Next" to create payrun and preview employees
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-6">
                {loading ? (
                  <LoadingSpinner size="lg" message="Loading employee data..." />
                ) : payslips.length > 0 ? (
                  <>
                    <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200 p-6 rounded-2xl">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                          <Users className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="text-sm text-blue-600 font-medium">Ready to Process</p>
                          <p className="text-lg font-bold text-gray-900">
                            {payslips.length} employees found with salary structures
                          </p>
                        </div>
                      </div>
                    </div>
                    <DataTable columns={columns} data={payslips} />
                  </>
                ) : (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Users className="w-10 h-10 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Ready to Compute</h3>
                    <p className="text-gray-500">Click "Next" to compute payroll for this period.</p>
                  </div>
                )}
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200 p-6 rounded-2xl">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-yellow-500 rounded-xl flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-yellow-900 text-lg">Review Mode</h3>
                      <p className="text-sm text-yellow-700 mt-1">
                        Payroll has been computed. Review the data carefully before finalizing.
                      </p>
                    </div>
                  </div>
                </div>
                {loading ? (
                  <LoadingSpinner size="lg" message="Computing payroll..." />
                ) : (
                  <DataTable columns={columns} data={payslips} />
                )}
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 p-6 rounded-2xl">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-green-900 text-lg">Ready to Finalize</h3>
                      <p className="text-sm text-green-700 mt-1">
                        All validations passed. Click "Finalize Payroll" to complete the process.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <Card className="p-6 bg-gradient-to-br from-cyan-50 to-blue-50 border-2 border-cyan-100 hover:shadow-xl transition-shadow">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-cyan-500 rounded-lg flex items-center justify-center">
                          <DollarSign className="w-5 h-5 text-white" />
                        </div>
                        <div className="text-sm font-medium text-gray-600">Total Gross</div>
                      </div>
                      <div className="text-3xl font-bold text-gray-900">{formatCurrency(totalGross)}</div>
                    </Card>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <Card className="p-6 bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-100 hover:shadow-xl transition-shadow">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
                          <DollarSign className="w-5 h-5 text-white" />
                        </div>
                        <div className="text-sm font-medium text-gray-600">Total Deductions</div>
                      </div>
                      <div className="text-3xl font-bold text-red-600">{formatCurrency(totalDeductions)}</div>
                    </Card>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-100 hover:shadow-xl transition-shadow">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                          <CheckCircle className="w-5 h-5 text-white" />
                        </div>
                        <div className="text-sm font-medium text-gray-600">Total Net Pay</div>
                      </div>
                      <div className="text-3xl font-bold text-green-600">{formatCurrency(totalNet)}</div>
                    </Card>
                  </motion.div>
                </div>

                {loading ? (
                  <LoadingSpinner size="lg" message="Finalizing payroll..." />
                ) : (
                  <DataTable columns={columns} data={payslips} />
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="flex justify-between mt-8 pt-6 border-t-2 border-gray-100">
          <div className="flex gap-3">
            {currentStep > 0 && currentStep < 3 && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleBack}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-all font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </motion.button>
            )}
          </div>
          <div className="flex gap-3">
            {currentStep < steps.length - 1 ? (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleNext}
                disabled={loading}
                className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white rounded-xl disabled:opacity-50 shadow-lg hover:shadow-xl transition-all font-semibold"
              >
                {loading ? 'Processing...' : 'Next'}
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleFinalize}
                disabled={loading}
                className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl disabled:opacity-50 shadow-lg hover:shadow-xl transition-all font-semibold"
              >
                {loading ? 'Processing...' : 'Finalize Payroll'}
                <CheckCircle className="w-5 h-5" />
              </motion.button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
