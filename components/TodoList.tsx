import { Database } from '@/lib/schema';
import { Session, useSupabaseClient } from '@supabase/auth-helpers-react';
import { useEffect, useState } from 'react';
import axios from 'axios';

type Todos = Database['public']['Tables']['todos']['Row'];

interface TodoListProps {
  session: Session;
  updateBalance?: () => Promise<void>; // Make sure to add this line
}

const CURRENCY_API_KEY = '0f09fa70b1012bbc2ae56829';
const FROM_CURRENCY = 'LKR';
const TO_CURRENCY = 'AED';

export type CurrencyConversionResult = {
  totalAmount: number;
  convertedTotalAmount: number | null;
};

export const calculateCurrencyConversion = async (totalAmount: number): Promise<CurrencyConversionResult> => {
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

export default function TodoList({ session }: { session: Session }) {
  const supabase = useSupabaseClient<Database>();
  const [todos, setTodos] = useState<Todos[]>([]);
  const [newTaskText, setNewTaskText] = useState('');
  const [amountText, setAmountText] = useState('');
  const [errorText, setErrorText] = useState('');
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [convertedTotalAmount, setConvertedTotalAmount] = useState<number | null>(null);

  const user = session.user;

  useEffect(() => {
    const fetchTodos = async () => {
      const { data: todos, error } = await supabase
        .from('todos')
        .select('*')
        .order('id', { ascending: true });

      if (error) {
        console.log('error', error);
      } else {
        setTodos(todos);
        updateTotalAmount(todos);
      }
    };

    fetchTodos();
  }, [supabase]);

  useEffect(() => {
    const fetchExchangeRate = async () => {
      try {
        const result = await calculateCurrencyConversion(totalAmount);
        setConvertedTotalAmount(result.convertedTotalAmount);
      } catch (error: any) {
        console.error("Error fetching exchange rate:", error.message);
      }
    };

    if (totalAmount !== null) {
      fetchExchangeRate();
    }
  }, [totalAmount]);

  const updateTotalAmount = (todos: Todos[]) => {
    const sum = todos.reduce((acc, todo) => acc + (todo.amount ?? 0), 0);
    setTotalAmount(sum);
  };
  

  const addTodo = async (taskText: string) => {
    let task = taskText.trim();
    if (task.length) {
      const { data: todo, error } = await supabase
        .from('todos')
        .insert({ task, user_id: user.id, amount: parseFloat(amountText) })
        .select()
        .single();

      if (error) {
        setErrorText(error.message);
      } else {
        setTodos([...todos, todo]);
        setNewTaskText('');
        setAmountText('');
        updateTotalAmount([...todos, todo]);
      }
    }
  };

  const deleteTodo = async (id: number) => {
    try {
      await supabase.from('todos').delete().eq('id', id).throwOnError();
      setTodos(todos.filter((x) => x.id !== id));
      updateTotalAmount(todos.filter((x) => x.id !== id));
    } catch (error) {
      console.log('error', error);
    }
  };

  return (
    <div className="w-full p-4">
      <h1 className="mb-12">Expenses</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          addTodo(newTaskText);
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
          placeholder="Add Amount"
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
          {todos.map((todo) => (
            <Todo key={todo.id} todo={todo} onDelete={() => deleteTodo(todo.id)} />
          ))}
        </ul>
      </div>
      <p  className="pt-4">
        Total Expenses: LKR {totalAmount} - AED{' '}
        {convertedTotalAmount !== null ? convertedTotalAmount.toFixed(2) : 'Loading...'}
      </p>
    </div>
  );
}

const Todo = ({ todo, onDelete }: { todo: Todos; onDelete: () => void }) => {
  const supabase = useSupabaseClient<Database>();
  const [isCompleted, setIsCompleted] = useState(todo.is_complete);

  const toggle = async () => {
    try {
      const { data } = await supabase
        .from('todos')
        .update({ is_complete: !isCompleted })
        .eq('id', todo.id)
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
            <div className="flex-auto  md:w-96">{todo.task} </div>
            <div className="flex-auto  md:w-8">-</div>
            <div className="flex-auto">LKR {todo.amount}</div>
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
