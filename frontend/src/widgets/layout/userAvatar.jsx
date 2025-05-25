import React from 'react';
import { UserIcon } from '@heroicons/react/24/outline';

export function UserAvatar({ photoURL, alt }) {
  return (
    <div className="w-40 h-40 rounded-full bg-gray-200 border-2 border-white overflow-hidden flex items-center justify-center">
      {photoURL ? (
        <img src={photoURL} alt={alt} className="w-full h-full object-cover" />
      ) : (
        <UserIcon className="w-16 h-16 text-black" />
      )}
    </div>
  );
}