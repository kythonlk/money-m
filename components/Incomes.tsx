import { Database } from '@/lib/schema';
import { Session, useSupabaseClient } from '@supabase/auth-helpers-react';
import { useEffect, useState } from 'react';
import axios from 'axios';

type Incomes = Database['public']['Tables']['income']['Row'];

export type CurrencyConversionResult = {
  totalAmount: number;
  convertedTotalAmount: number | null;
};

export const calculateCurrencyConversion = async (totalAmount: number): Promise<CurrencyConversionResult> => {
  const CURRENCY_API_KEY = '0f09fa70b1012bbc2ae56829';
  const FROM_CURRENCY = 'LKR';
  const TO_CURRENCY = 'AED';

  try {
    const response = await axios.get(
      `https://open.er-api.com/v6/latest/${FROM_CURRENCY}?apikey=${CURRENCY_API_KEY}`
    );
    const exchangeRate = response.data.rates[TO_CURRENCY];
    const convertedAmount = totalAmount * exchangeRate;

    return {
      totalAmount,
      convertedTotalAmount: convertedAmount,
    };
  } catch (error : any) {
    console.error('Error fetching exchange rate:', error.message);
    return {
      totalAmount,
      convertedTotalAmount: null,
    };
  }
};

const IncomeList = ({ session }: { session: Session }) => {
  const supabase = useSupabaseClient<Database>();
  const [incomes, setIncomes] = useState<Incomes[]>([]);
  const [newTaskText, setNewTaskText] = useState('');
  const [amountText, setAmountText] = useState('');
  const [errorText, setErrorText] = useState('');
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [convertedTotalAmount, setConvertedTotalAmount] = useState<number | null>(null);

  const user = session.user;

  useEffect(() => {
    const fetchIncome = async () => {
      const { data: incomes, error } = await supabase
        .from('income')
        .select('*')
        .order('id', { ascending: true });

      if (error) {
        console.log('error', error);
      } else {
        setIncomes(incomes);
        updateTotalAmount(incomes);
      }
    };

    fetchIncome();
  }, [supabase]);

  useEffect(() => {
    const fetchExchangeRate = async () => {
      if (totalAmount !== null) {
        const result = await calculateCurrencyConversion(totalAmount);
        setConvertedTotalAmount(result.convertedTotalAmount);
      }
    };

    fetchExchangeRate();
  }, [totalAmount]);

  const updateTotalAmount = (income: Incomes[]) => {
    const sum = income.reduce((acc, income) => acc + (income.amount ?? 0), 0);
    setTotalAmount(sum);
  };

  const addIncome = async (taskText: string) => {
    let task = taskText.trim();
    if (task.length) {
      const { data: income, error } = await supabase
        .from('income')
        .insert({ task, user_id: user.id, amount: parseFloat(amountText) })
        .select()
        .single();

      if (error) {
        setErrorText(error.message);
      } else {
        setIncomes([...incomes, income]);
        setNewTaskText('');
        setAmountText('');
        updateTotalAmount([...incomes, income]);
      }
    }
  };

  const deleteIncome = async (id: number) => {
    try {
      await supabase.from('income').delete().eq('id', id).throwOnError();
      setIncomes(incomes.filter((x) => x.id !== id));
      updateTotalAmount(incomes.filter((x) => x.id !== id));
    } catch (error) {
      console.log('error', error);
    }
  };

  return (
    <div className="w-full p-4">
      <h1 className="mb-12">Incomes</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          addIncome(newTaskText);
        }}
        className="flex gap-2 my-2"
      >
        <input
          className="rounded w-full p-2 border-2 border-black"
          type="text"
          placeholder="Add Note"
          value={newTaskText}
          onChange={(e) => {
            setErrorText('');
            setNewTaskText(e.target.value);
          }}
        />
        <input
          className="rounded w-full p-2 border-2 border-black"
          type="number"
          placeholder="Enter Amount"
          value={amountText}
          onChange={(e) => {
            setErrorText('');
            setAmountText(e.target.value);
          }}
        />
        <button className="btn-black" type="submit">
          Add
        </button>
      </form>
      {!!errorText && <Alert text={errorText} />}
      <div className="bg-white shadow overflow-hidden rounded-md">
        <ul>
          {incomes.map((income) => (
            <Income key={income.id} income={income} onDelete={() => deleteIncome(income.id)} />
          ))}
        </ul>
      </div>
      <p className="pt-4">
        Total Income: LKR {totalAmount} - AED{' '}
        {convertedTotalAmount !== null ? convertedTotalAmount.toFixed(2) : 'Loading...'}
      </p>
    </div>
  );
};

const Income = ({ income, onDelete }: { income: Incomes; onDelete: () => void }) => {
  const supabase = useSupabaseClient<Database>();
  const [isCompleted, setIsCompleted] = useState(income.is_complete);

  const toggle = async () => {
    try {
      const { data } = await supabase
        .from('income')
        .update({ is_complete: !isCompleted })
        .eq('id', income.id)
        .throwOnError()
        .select()
        .single();

      if (data) setIsCompleted(data.is_complete);
    } catch (error) {
      console.log('error', error);
    }
  };

  return (
    <li className="w-full block cursor-pointer hover:bg-gray-200 focus:outline-none focus:bg-gray-200 transition duration-150 ease-in-out">
      <div className="flex items-center px-4 py-4 sm:px-6">
        <div className="min-w-0 flex-1 flex items-center">
          <div className="text-sm leading-5 font-medium truncate flex">
            <div className="flex-auto  w-96">{income.task} </div>
            <div className="flex-auto  w-8">-</div>
            <div className="flex-auto">LKR {income.amount}</div>
          </div>
        </div>
        <div>
          <input
            className="cursor-pointer"
            onChange={(e) => toggle()}
            type="checkbox"
            placeholder="make coffee"
            checked={isCompleted ? true : false}
          />
        </div>
        <button
          title="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete();
          }}
          className="w-4 h-4 ml-2 border-2 hover:border-black rounded"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="gray">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    </li>
  );
};

const Alert = ({ text }: { text: string }) => (
  <div className="rounded-md bg-red-100 p-4 my-3">
    <div className="text-sm leading-5 text-red-700">{text}</div>
  </div>
);

export default IncomeList;
