// src/components/ProfileHeader.tsx
import React, { useRef, useState } from 'react';
import { Settings, Camera, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { storage } from '../config/firebase'; // Import Firebase Storage
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { userManagementService } from '../services/UserManagementService'; // Import User Management Service
import { Validation } from '../utils/validation';

interface ProfileHeaderProps {
  name: string;
  role: string;
  profileImage: string | null;
  coverPhoto: string;
  userId: string;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  name,
  role,
  profileImage,
  coverPhoto,
  userId
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleCoverPhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    if (!Validation.isValidFileType(file, ['image/jpeg', 'image/png'])) {
      setUploadError('Invalid file type. Please upload a JPEG or PNG image.');
      return;
    }

    if (!Validation.isValidFileSize(file, 5)) { // 5MB limit
      setUploadError('File is too large. Maximum size is 5MB.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const storageRef = ref(storage, `users/${userId}/coverPhoto`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      // Update user's profile with the new cover photo URL
      await userManagementService.updateUser(userId, { coverImage: downloadURL });

    } catch (error: any) {
      setUploadError(error.message || 'Failed to upload cover photo.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="relative w-full">
      {/* Cover Photo */}
      <div
        className="w-full h-64 bg-cover bg-center rounded-t-xl" // Increased height
        style={{
          backgroundImage: coverPhoto.startsWith('linear-gradient')
            ? coverPhoto
            : `url(${coverPhoto})`,
        }}
      >
        {/* Semi-transparent overlay (only if it's an image) */}
        {!coverPhoto.startsWith('linear-gradient') && (
          <div className="absolute inset-0 bg-black opacity-30 rounded-t-xl"></div>
        )}

        {/* Cover Photo Upload */}
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handleCoverPhotoChange}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="absolute top-4 right-4 bg-white bg-opacity-75 text-gray-700 p-2 rounded-full hover:bg-opacity-100 transition-colors"
          title="Change Cover Photo"
        >
          <Camera size={20} />
        </button>
        {isUploading && (
          <div className="absolute top-1/2 right-4 transform -translate-y-1/2">
            <Loader2 className="animate-spin text-white" size={20} />
          </div>
        )}
      </div>

      {/* Content Container (Profile Picture, User Info, Settings) */}
      <div className="relative px-4 pt-16 pb-4"> {/* Added padding */}
        {/* Profile Picture */}
        <div className="absolute left-1/2 transform -translate-x-1/2 -top-16">
          <img
            src={profileImage || 'https://via.placeholder.com/150'}
            alt="Profile"
            className="w-32 h-32 rounded-full border-4 border-white object-cover"
          />
        </div>

        {/* User Info */}
        <div className="text-center mt-4">
          <h2 className="text-xl font-bold text-gray-800">{name}</h2>
          <p className="text-gray-600 capitalize">{role}</p>
        </div>

        {/* Settings Button */}
        <div className="absolute top-4 right-4">
          <Link
            to="/admin/settings"
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-full transition-colors"
          >
            <Settings size={20} />
          </Link>
        </div>

        {uploadError && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded">
            {uploadError}
          </div>
        )}
      </div>
    </div>
  );
};
