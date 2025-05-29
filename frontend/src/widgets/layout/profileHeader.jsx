import React, { memo } from 'react';
import { Typography, Button } from '@material-tailwind/react';
import { UserAvatar } from './UserAvatar';

function ProfileHeaderComponent({ fullName, email, photoURL, onConnect }) {
  return (
    <div className="flex flex-col lg:flex-row justify-between items-center">
      <div className="flex items-center gap-6">
        <div className="-mt-20">
          <UserAvatar photoURL={photoURL} alt={fullName} />
        </div>
        <div className="flex flex-col mt-2">
          <Typography variant="h4" color="blue-gray">
            {fullName}
          </Typography>
          <Typography variant="paragraph" color="gray" className="!mt-0 font-normal">
            {email}
          </Typography>
        </div>
      </div>
      <Button onClick={onConnect} className="bg-gray-900">
        Uredi profil
      </Button>
    </div>
  );
}

// Memoize to prevent re-render when props haven’t changed
export const ProfileHeader = memo(ProfileHeaderComponent);