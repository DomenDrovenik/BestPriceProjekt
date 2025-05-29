import React, { memo } from 'react';
import { Card, CardBody, Typography } from '@material-tailwind/react';
import { StarIcon } from '@heroicons/react/24/solid';

function ProfilePreferencesComponent({ stores, categories }) {
  return (
    <Card className="mb-6">
      <CardBody>
        <Typography variant="h5" className="mb-4 flex items-center gap-2">
          <StarIcon className="w-6 h-6 text-yellow-500" /> Preference
        </Typography>
        <div className="flex flex-wrap gap-2">
          {(stores.length ? stores : ['Ni nastavljenih trgovin']).map((s, i) => (
            <span key={i} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
              {s}
            </span>
          ))}
          {(categories.length ? categories : ['Ni nastavljenih kategorij']).map((c, i) => (
            <span key={i} className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
              {c}
            </span>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}


// Memoize to prevent re-render when props haven’t changed
export const ProfilePreferences = memo(ProfilePreferencesComponent);