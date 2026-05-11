// components/admin/UserRegistrationForm.tsx
'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

type MembershipType = 'personal' | 'organization';

interface UserRegistrationFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  isAdmin?: boolean;
}

export default function UserRegistrationForm({ onSuccess, onCancel, isAdmin = false }: UserRegistrationFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: isAdmin ? "123456" : "",
    confirmPassword: isAdmin ? "123456" : "",
    nida: "",
    membershipType: "personal" as MembershipType,
    phoneNumber: "",
    otherPhoneNumber: "",
    organizationName: "",
    isAdmin: false
  });
  
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
      ...(name === 'membershipType' && value === 'personal' ? { organizationName: '' } : {})
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    // Basic validation
    if (!isAdmin && formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!formData.nida || formData.nida.length < 16) {
      setError("Please enter a valid NIDA number (16 digits)");
      return;
    }

    setIsLoading(true);

    try {
      const apiUrl = isAdmin ? '/api/admin/users' : '/api/auth/register';
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          nida: formData.nida,
          membershipType: formData.membershipType,
          phoneNumber: formData.phoneNumber,
          otherPhoneNumber: formData.otherPhoneNumber,
          organizationName: formData.organizationName,
          isAdmin: isAdmin ? formData.isAdmin : false,
          isApproved: isAdmin // Auto-approve if added by admin
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to register user');
      }

      toast.success(isAdmin ? 'User created successfully' : 'Registration successful! Please wait for admin approval.');
      
      if (onSuccess) {
        onSuccess();
      }
      
      if (!isAdmin) {
        router.push('/auth/login');
      }
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full bg-gray-100 p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center">
        {isAdmin ? 'Add New User' : 'Create an Account'}
      </h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Full Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email *
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Password *
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            readOnly={isAdmin}
            minLength={6}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 bg-gray-100"
          />
          {isAdmin && (
            <p className="mt-1 text-sm text-gray-500">
              Default password is set to 123456. User should change it after first login.
            </p>
          )}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
            Confirm Password *
          </label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            readOnly={isAdmin}
            minLength={6}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 bg-gray-100"
          />
        </div>

        <div>
          <label htmlFor="nida" className="block text-sm font-medium text-gray-700">
            NIDA Number *
          </label>
          <input
            type="text"
            id="nida"
            name="nida"
            value={formData.nida}
            onChange={handleChange}
            required
            placeholder="Enter 16-digit NIDA number"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Membership Type *</label>
          <div className="mt-2 space-y-2">
            <label className="inline-flex items-center">
              <input
                type="radio"
                name="membershipType"
                value="personal"
                checked={formData.membershipType === 'personal'}
                onChange={handleChange}
                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300"
              />
              <span className="ml-2">Personal</span>
            </label>
            <label className="inline-flex items-center ml-6">
              <input
                type="radio"
                name="membershipType"
                value="organization"
                checked={formData.membershipType === 'organization'}
                onChange={handleChange}
                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300"
              />
              <span className="ml-2">Organization</span>
            </label>
          </div>
        </div>

        {formData.membershipType === 'organization' && (
          <div>
            <label htmlFor="organizationName" className="block text-sm font-medium text-gray-700">
              Organization Name *
            </label>
            <input
              type="text"
              id="organizationName"
              name="organizationName"
              value={formData.organizationName}
              onChange={handleChange}
              required={formData.membershipType === 'organization'}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
            />
          </div>
        )}

        <div>
          <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">
            Phone Number *
          </label>
          <input
            type="tel"
            id="phoneNumber"
            name="phoneNumber"
            value={formData.phoneNumber}
            onChange={handleChange}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
          />
        </div>

        <div>
          <label htmlFor="otherPhoneNumber" className="block text-sm font-medium text-gray-700">
            Alternative Phone Number
          </label>
          <input
            type="tel"
            id="otherPhoneNumber"
            name="otherPhoneNumber"
            value={formData.otherPhoneNumber}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
          />
        </div>

        {isAdmin && (
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isAdmin"
              name="isAdmin"
              checked={formData.isAdmin}
              onChange={handleChange}
              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
            />
            <label htmlFor="isAdmin" className="ml-2 block text-sm text-gray-700">
              Make this user an administrator
            </label>
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-4">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            {isLoading ? 'Processing...' : isAdmin ? 'Create User' : 'Register'}
          </button>
        </div>
      </form>
    </div>
  );
}