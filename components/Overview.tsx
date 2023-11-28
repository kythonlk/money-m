import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

interface OverviewProps {
  balance: number;
  expenses: number;
  income: number;
}


const Overview: React.FC<OverviewProps> = ({ balance, expenses, income }) => {
  const data = {
    labels: ['Expenses', 'Balance'],
    datasets: [
      {
        label: '% of Income',
        data: [expenses, income - expenses],
        backgroundColor: [
          'rgb(198 28 28)',
          'rgb(28 63 198)',
        ],
        borderColor: [
          'rgb(0 0 0)',
          'rgb(0 0 0)'
        ],
        borderWidth: 1,
      },
    ],
  };

  return (
    <>
      <div className="w-full p-4">
        <h1 className="mb-12 text-2xl md:text-4xl">Incomes</h1>
        <p>(dev mode - these not working yet)</p>
        <div className="md:w-1/3">
          <Pie data={data} />
        </div>
        <div className="flex flex-col md:flex-row pt-10 gap-8 text-xl">
          <p>Total Income : {income}</p>
          <p>Total Expenses : {expenses}</p>
          <p>Total Balance : {income - expenses}</p>
          <p>Total Investments : {income - expenses}</p>
        </div>
      </div>
    </>
  );
}

export default Overview;