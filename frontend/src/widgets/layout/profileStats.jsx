import React, { memo } from 'react';
import { Typography } from '@material-tailwind/react';

function ProfileStatsComponent({ totalSavings, comparisons, alerts }) {
  return (
    <div className="flex space-x-6 mt-4">
      <div className="text-center">
        <Typography variant="lead" color="blue-gray" className="font-bold uppercase">
          {totalSavings.toFixed(2)} €
        </Typography>
        <Typography variant="small" className="font-normal text-blue-gray-500">
          Prihranki
        </Typography>
      </div>
      <div className="text-center">
        <Typography variant="lead" color="blue-gray" className="font-bold uppercase">
          {comparisons}
        </Typography>
        <Typography variant="small" className="font-normal text-blue-gray-500">
          Primerjave
        </Typography>
      </div>
      <div className="text-center">
        <Typography variant="lead" color="blue-gray" className="font-bold uppercase">
          {alerts}
        </Typography>
        <Typography variant="small" className="font-normal text-blue-gray-500">
          Opozorila
        </Typography>
      </div>
    </div>
  );
}


// Memoize to prevent re-render when props haven’t changed
export const ProfileStats = memo(ProfileStatsComponent);