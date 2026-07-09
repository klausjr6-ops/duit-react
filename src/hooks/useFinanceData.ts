import { useState, useEffect } from 'react';

export function useFinanceData() {
  const [data, setData] = useState(() => {
    try {
      const saved = localStorage.getItem('duit_app_state');
      const parsed = saved ? JSON.parse(saved) : null;
      
      // Jika data berhasil di-parse dan bukan null, gunakan data tersebut
      if (parsed && typeof parsed === 'object') {
        // Pastikan variabel 'score' dkk ada untuk mencegah error 'e.score'
        return {
          score: parsed.score ?? 80,
          balance: parsed.balance ?? 187967,
          monthlyExpense: parsed.monthlyExpense ?? 238700,
          savings: parsed.savings ?? 0,
          todayIncome: parsed.todayIncome ?? 50000,
          todayExpense: parsed.todayExpense ?? 64000,
          scheduleCount: parsed.scheduleCount ?? 1,
          dailyIncome: parsed.dailyIncome ?? 426667,
          dailyExpense: parsed.dailyExpense ?? 238700,
          savingsPct: parsed.savingsPct ?? 44,
          transactions: parsed.transactions ?? [],
          schedules: parsed.schedules ?? [],
          goals: parsed.goals ?? []
        };
      }
    } catch (e) {
      console.error("Gagal membaca memori lokal, mereset data...", e);
    }
    
    // Default fallback jika localStorage kosong atau rusak
    return {
      score: 80,
      balance: 187967,
      monthlyExpense: 238700,
      savings: 0,
      todayIncome: 50000,
      todayExpense: 64000,
      scheduleCount: 1,
      dailyIncome: 426667,
      dailyExpense: 238700,
      savingsPct: 44,
      transactions: [],
      schedules: [],
      goals: []
    };
  });

  useEffect(() => {
    if (data) {
      localStorage.setItem('duit_app_state', JSON.stringify(data));
    }
  }, [data]);

  return [data, setData] as const;
}