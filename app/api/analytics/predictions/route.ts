import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const months = parseInt(searchParams.get('months') || '6');

    // Get historical data for predictions
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('type, amount, date, category')
      .eq('user_id', user.id)
      .gte('date', startDate.toISOString())
      .lte('date', endDate.toISOString())
      .order('date', { ascending: true });

    if (error) throw error;

    // Generate predictions
    const predictions = generatePredictions(transactions || [], months);

    return NextResponse.json({
      success: true,
      predictions
    });

  } catch (error) {
    console.error('Error generating predictions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function generatePredictions(transactions: any[], months: number) {
  // Group transactions by month
  const monthlyData = transactions.reduce((acc, transaction) => {
    const month = new Date(transaction.date).toISOString().substring(0, 7);
    if (!acc[month]) {
      acc[month] = { income: 0, expenses: 0, categories: {} };
    }
    
    if (transaction.type === 'income') {
      acc[month].income += transaction.amount;
    } else {
      acc[month].expenses += transaction.amount;
      if (!acc[month].categories[transaction.category]) {
        acc[month].categories[transaction.category] = 0;
      }
      acc[month].categories[transaction.category] += transaction.amount;
    }
    
    return acc;
  }, {} as Record<string, any>);

  const monthlyEntries = Object.entries(monthlyData).sort();
  
  if (monthlyEntries.length < 2) {
    return {
      nextMonthIncome: 0,
      nextMonthExpenses: 0,
      nextMonthNet: 0,
      trendAnalysis: 'insufficient_data',
      categoryForecasts: [],
      recommendations: ['Add more transaction data for better predictions']
    };
  }

  // Calculate trends
  const incomeTrends = monthlyEntries.map(([, data]) => (data as any).income);
  const expenseTrends = monthlyEntries.map(([, data]) => (data as any).expenses);
  
  const incomeSlope = calculateSlope(incomeTrends);
  const expenseSlope = calculateSlope(expenseTrends);
  
  // Predict next month
  const lastMonth = monthlyEntries[monthlyEntries.length - 1][1] as any;
  const nextMonthIncome = Math.max(0, lastMonth.income + incomeSlope);
  const nextMonthExpenses = Math.max(0, lastMonth.expenses + expenseSlope);
  const nextMonthNet = nextMonthIncome - nextMonthExpenses;

  // Category forecasts
  const categoryForecasts = generateCategoryForecasts(monthlyEntries);

  // Generate recommendations
  const recommendations = generateRecommendations({
    incomeSlope,
    expenseSlope,
    nextMonthIncome,
    nextMonthExpenses,
    nextMonthNet,
    categoryForecasts
  });

  // Trend analysis
  let trendAnalysis = 'stable';
  if (incomeSlope > 0 && expenseSlope < 0) {
    trendAnalysis = 'improving';
  } else if (incomeSlope < 0 && expenseSlope > 0) {
    trendAnalysis = 'declining';
  } else if (Math.abs(incomeSlope) > Math.abs(expenseSlope)) {
    trendAnalysis = incomeSlope > 0 ? 'income_growing' : 'income_declining';
  } else if (Math.abs(expenseSlope) > Math.abs(incomeSlope)) {
    trendAnalysis = expenseSlope > 0 ? 'expenses_growing' : 'expenses_declining';
  }

  return {
    nextMonthIncome: Math.round(nextMonthIncome * 100) / 100,
    nextMonthExpenses: Math.round(nextMonthExpenses * 100) / 100,
    nextMonthNet: Math.round(nextMonthNet * 100) / 100,
    trendAnalysis,
    categoryForecasts,
    recommendations,
    confidence: calculateConfidence(monthlyEntries.length, months)
  };
}

function calculateSlope(values: number[]): number {
  if (values.length < 2) return 0;
  
  const n = values.length;
  const x = Array.from({ length: n }, (_, i) => i);
  const y = values;
  
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
  
  return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
}

function generateCategoryForecasts(monthlyEntries: [string, any][]) {
  const categoryData: Record<string, number[]> = {};
  
  // Collect category data
  monthlyEntries.forEach(([, data]) => {
    Object.entries(data.categories).forEach(([category, amount]) => {
      if (!categoryData[category]) {
        categoryData[category] = [];
      }
      categoryData[category].push(amount as number);
    });
  });

  // Generate forecasts for each category
  return Object.entries(categoryData).map(([category, amounts]) => {
    if (amounts.length < 2) {
      return {
        category,
        predictedAmount: amounts[0] || 0,
        trend: 'stable',
        confidence: 'low'
      };
    }

    const slope = calculateSlope(amounts);
    const lastAmount = amounts[amounts.length - 1];
    const predictedAmount = Math.max(0, lastAmount + slope);
    
    let trend = 'stable';
    if (slope > lastAmount * 0.1) trend = 'increasing';
    else if (slope < -lastAmount * 0.1) trend = 'decreasing';

    return {
      category,
      predictedAmount: Math.round(predictedAmount * 100) / 100,
      trend,
      confidence: amounts.length >= 3 ? 'high' : 'medium'
    };
  }).sort((a, b) => b.predictedAmount - a.predictedAmount);
}

function generateRecommendations(data: any) {
  const recommendations = [];

  if (data.nextMonthNet < 0) {
    recommendations.push({
      type: 'warning',
      title: 'Negative Cash Flow Predicted',
      message: 'You may spend more than you earn next month. Consider reducing expenses or increasing income.',
      priority: 'high'
    });
  }

  if (data.expenseSlope > data.incomeSlope && data.expenseSlope > 0) {
    recommendations.push({
      type: 'warning',
      title: 'Expenses Growing Faster Than Income',
      message: 'Your expenses are increasing faster than your income. Review your spending habits.',
      priority: 'medium'
    });
  }

  if (data.incomeSlope > 0 && data.expenseSlope < 0) {
    recommendations.push({
      type: 'positive',
      title: 'Great Financial Trend',
      message: 'Your income is growing while expenses are decreasing. Keep up the good work!',
      priority: 'low'
    });
  }

  // Category-specific recommendations
  const topExpenseCategory = data.categoryForecasts[0];
  if (topExpenseCategory && topExpenseCategory.trend === 'increasing') {
    recommendations.push({
      type: 'info',
      title: 'Monitor Top Expense Category',
      message: `${topExpenseCategory.category} spending is predicted to increase. Consider setting a budget for this category.`,
      priority: 'medium'
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      type: 'info',
      title: 'Stable Financial Position',
      message: 'Your financial trends look stable. Continue monitoring your spending and income patterns.',
      priority: 'low'
    });
  }

  return recommendations;
}

function calculateConfidence(dataPoints: number, months: number): string {
  if (dataPoints < 3) return 'low';
  if (dataPoints < months * 0.7) return 'medium';
  return 'high';
}
