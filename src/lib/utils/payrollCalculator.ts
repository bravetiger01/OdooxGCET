interface Component {
  component_name: string;
  component_type: string;
  calculation_type: string;
  value: number;
}

interface CalculatedComponent {
  name: string;
  amount: number;
  calculation_type: string;
  value: number;
}

interface CalculationResult {
  earnings: CalculatedComponent[];
  deductions: CalculatedComponent[];
  basic_salary: number;
  gross_salary: number;
  total_deductions: number;
}

export function calculateComponents(monthly_wage: number, components: Component[]): CalculationResult {
  const calculated: CalculationResult = {
    earnings: [],
    deductions: [],
    basic_salary: 0,
    gross_salary: 0,
    total_deductions: 0
  };

  // First pass: calculate basic salary and percentage_of_wage/fixed components
  for (const comp of components) {
    if (comp.component_type === 'earning' && comp.calculation_type !== 'percentage_of_basic') {
      let amount = 0;
      
      if (comp.calculation_type === 'fixed') {
        amount = parseFloat(String(comp.value));
      } else if (comp.calculation_type === 'percentage_of_wage') {
        amount = (monthly_wage * parseFloat(String(comp.value))) / 100;
      }
      
      if (comp.component_name.toLowerCase().includes('basic')) {
        calculated.basic_salary = amount;
      }
      
      calculated.earnings.push({
        name: comp.component_name,
        amount: amount,
        calculation_type: comp.calculation_type,
        value: comp.value
      });
    }
  }

  // Second pass: calculate percentage_of_basic components
  for (const comp of components) {
    if (comp.component_type === 'earning' && comp.calculation_type === 'percentage_of_basic') {
      const amount = (calculated.basic_salary * parseFloat(String(comp.value))) / 100;
      calculated.earnings.push({
        name: comp.component_name,
        amount: amount,
        calculation_type: comp.calculation_type,
        value: comp.value
      });
    }
  }

  // Calculate gross salary
  calculated.gross_salary = calculated.earnings.reduce((sum, e) => sum + e.amount, 0);

  // Calculate deductions
  for (const comp of components) {
    if (comp.component_type === 'deduction') {
      let amount = 0;
      
      if (comp.calculation_type === 'fixed') {
        amount = parseFloat(String(comp.value));
      } else if (comp.calculation_type === 'percentage_of_wage') {
        amount = (monthly_wage * parseFloat(String(comp.value))) / 100;
      } else if (comp.calculation_type === 'percentage_of_basic') {
        amount = (calculated.basic_salary * parseFloat(String(comp.value))) / 100;
      }
      
      calculated.deductions.push({
        name: comp.component_name,
        amount: amount,
        calculation_type: comp.calculation_type,
        value: comp.value
      });
    }
  }

  calculated.total_deductions = calculated.deductions.reduce((sum, d) => sum + d.amount, 0);

  return calculated;
}
