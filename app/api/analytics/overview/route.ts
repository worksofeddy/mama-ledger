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
    const period = searchParams.get('period') || '30'; // days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    // Get comprehensive analytics data
    const [
      transactionsResult,
      categoriesResult,
      monthlyTrendsResult,
      spendingPatternsResult,
      incomeVsExpenseResult,
      topCategoriesResult,
      cashFlowResult
    ] = await Promise.all([
      // Total transactions and amounts
      supabase
        .from('transactions')
        .select('type, amount, date, category')
        .eq('user_id', user.id)
        .gte('date', startDate.toISOString())
        .lte('date', endDate.toISOString()),

      // Category breakdown
      supabase
        .from('transactions')
        .select('category, type, amount')
        .eq('user_id', user.id)
        .gte('date', startDate.toISOString())
        .lte('date', endDate.toISOString()),

      // Monthly trends (last 6 months)
      supabase
        .from('transactions')
        .select('type, amount, date')
        .eq('user_id', user.id)
        .gte('date', new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString()),

      // Spending patterns by day of week
      supabase
        .from('transactions')
        .select('amount, date, type')
        .eq('user_id', user.id)
        .eq('type', 'expense')
        .gte('date', startDate.toISOString())
        .lte('date', endDate.toISOString()),

      // Income vs Expense comparison
      supabase
        .from('transactions')
        .select('type, amount')
        .eq('user_id', user.id)
        .gte('date', startDate.toISOString())
        .lte('date', endDate.toISOString()),

      // Top spending categories
      supabase
        .from('transactions')
        .select('category, amount')
        .eq('user_id', user.id)
        .eq('type', 'expense')
        .gte('date', startDate.toISOString())
        .lte('date', endDate.toISOString()),

      // Cash flow analysis
      supabase
        .from('transactions')
        .select('type, amount, date')
        .eq('user_id', user.id)
        .gte('date', startDate.toISOString())
        .lte('date', endDate.toISOString())
        .order('date', { ascending: true })
    ]);

    // Process the data
    const transactions = transactionsResult.data || [];
    const categories = categoriesResult.data || [];
    const monthlyTrends = monthlyTrendsResult.data || [];
    const spendingPatterns = spendingPatternsResult.data || [];
    const incomeVsExpense = incomeVsExpenseResult.data || [];
    const topCategories = topCategoriesResult.data || [];
    const cashFlow = cashFlowResult.data || [];

    // Calculate key metrics
    const totalIncome = incomeVsExpense
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = incomeVsExpense
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const netIncome = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? (netIncome / totalIncome) * 100 : 0;

    // Category analysis
    const categoryBreakdown = categories.reduce((acc, transaction) => {
      const key = `${transaction.category}_${transaction.type}`;
      if (!acc[key]) {
        acc[key] = { category: transaction.category, type: transaction.type, amount: 0, count: 0 };
      }
      acc[key].amount += transaction.amount;
      acc[key].count += 1;
      return acc;
    }, {} as Record<string, any>);

    // Monthly trends
    const monthlyData = monthlyTrends.reduce((acc, transaction) => {
      const month = new Date(transaction.date).toISOString().substring(0, 7);
      if (!acc[month]) {
        acc[month] = { income: 0, expenses: 0 };
      }
      if (transaction.type === 'income') {
        acc[month].income += transaction.amount;
      } else {
        acc[month].expenses += transaction.amount;
      }
      return acc;
    }, {} as Record<string, any>);

    // Spending patterns by day of week
    const dayOfWeekSpending = spendingPatterns.reduce((acc, transaction) => {
      const day = new Date(transaction.date).getDay();
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayName = dayNames[day];
      if (!acc[dayName]) {
        acc[dayName] = { amount: 0, count: 0 };
      }
      acc[dayName].amount += transaction.amount;
      acc[dayName].count += 1;
      return acc;
    }, {} as Record<string, any>);

    // Top categories
    const topCategoriesData = topCategories.reduce((acc, transaction) => {
      if (!acc[transaction.category]) {
        acc[transaction.category] = { amount: 0, count: 0 };
      }
      acc[transaction.category].amount += transaction.amount;
      acc[transaction.category].count += 1;
      return acc;
    }, {} as Record<string, any>);

    // Cash flow analysis
    let runningBalance = 0;
    const cashFlowData = cashFlow.map(transaction => {
      if (transaction.type === 'income') {
        runningBalance += transaction.amount;
      } else {
        runningBalance -= transaction.amount;
      }
      return {
        date: transaction.date,
        amount: transaction.amount,
        type: transaction.type,
        balance: runningBalance
      };
    });

    // Calculate insights
    const insights = generateInsights({
      totalIncome,
      totalExpenses,
      netIncome,
      savingsRate,
      categoryBreakdown,
      monthlyData,
      dayOfWeekSpending,
      topCategoriesData,
      cashFlowData
    });

    return NextResponse.json({
      success: true,
      analytics: {
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          days: parseInt(period)
        },
        summary: {
          totalIncome,
          totalExpenses,
          netIncome,
          savingsRate: Math.round(savingsRate * 100) / 100,
          transactionCount: transactions.length
        },
        categoryBreakdown: Object.values(categoryBreakdown),
        monthlyTrends: Object.entries(monthlyData).map(([month, data]) => ({
          month,
          ...data,
          net: data.income - data.expenses
        })),
        spendingPatterns: Object.entries(dayOfWeekSpending).map(([day, data]) => ({
          day,
          ...data,
          average: data.count > 0 ? data.amount / data.count : 0
        })),
        topCategories: Object.entries(topCategoriesData)
          .map(([category, data]) => ({ category, ...data }))
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 10),
        cashFlow: cashFlowData,
        insights
      }
    });

  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function generateInsights(data: any) {
  const insights = [];

  // Savings rate insight
  if (data.savingsRate > 20) {
    insights.push({
      type: 'positive',
      title: 'Excellent Savings Rate',
      message: `You're saving ${data.savingsRate.toFixed(1)}% of your income. Great job!`,
      icon: 'trending-up'
    });
  } else if (data.savingsRate < 0) {
    insights.push({
      type: 'warning',
      title: 'Spending More Than Income',
      message: `You're spending ${Math.abs(data.savingsRate).toFixed(1)}% more than you earn. Consider reducing expenses.`,
      icon: 'alert-triangle'
    });
  }

  // Top spending category insight
  const topCategory = data.topCategories[0];
  if (topCategory) {
    insights.push({
      type: 'info',
      title: 'Top Spending Category',
      message: `${topCategory.category} accounts for ${((topCategory.amount / data.totalExpenses) * 100).toFixed(1)}% of your expenses.`,
      icon: 'pie-chart'
    });
  }

  // Monthly trend insight
  const monthlyEntries = Object.entries(data.monthlyData);
  if (monthlyEntries.length >= 2) {
    const latest = monthlyEntries[monthlyEntries.length - 1][1] as any;
    const previous = monthlyEntries[monthlyEntries.length - 2][1] as any;
    const incomeChange = ((latest.income - previous.income) / previous.income) * 100;
    const expenseChange = ((latest.expenses - previous.expenses) / previous.expenses) * 100;

    if (incomeChange > 10) {
      insights.push({
        type: 'positive',
        title: 'Income Growth',
        message: `Your income increased by ${incomeChange.toFixed(1)}% this month.`,
        icon: 'trending-up'
      });
    }

    if (expenseChange > 10) {
      insights.push({
        type: 'warning',
        title: 'Expense Increase',
        message: `Your expenses increased by ${expenseChange.toFixed(1)}% this month.`,
        icon: 'trending-down'
      });
    }
  }

  // Spending pattern insight
  const highestSpendingDay = Object.entries(data.dayOfWeekSpending)
    .sort(([,a], [,b]) => (b as any).amount - (a as any).amount)[0];
  
  if (highestSpendingDay) {
    insights.push({
      type: 'info',
      title: 'Spending Pattern',
      message: `You spend most on ${highestSpendingDay[0]}s (KES ${(highestSpendingDay[1] as any).amount.toLocaleString()}).`,
      icon: 'calendar'
    });
  }

  return insights;
}
