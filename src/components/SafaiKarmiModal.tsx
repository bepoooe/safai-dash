'use client';

import { useState, useEffect } from 'react';
import { X, User, Phone, MapPin, Calendar, Star, Save, AlertCircle } from 'lucide-react';
import { SafaiKarmi } from '@/types/staff';

interface SafaiKarmiModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (karmi: Omit<SafaiKarmi, 'id'>) => Promise<void>;
  onUpdate?: (id: string, karmi: Omit<SafaiKarmi, 'id'>) => Promise<void>;
  karmi?: SafaiKarmi | null;
  mode: 'add' | 'edit' | 'view';
}


export default function SafaiKarmiModal({ 
  isOpen, 
  onClose, 
  onSave, 
  onUpdate, 
  karmi, 
  mode 
}: SafaiKarmiModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    workingArea: '',
    status: 'Active' as 'Active' | 'On Leave' | 'Inactive',
    joinDate: '',
    lastActive: new Date().toISOString(),
    totalCollections: 0,
    rating: 5
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form data when modal opens or karmi changes
  useEffect(() => {
    if (isOpen) {
      if (karmi && (mode === 'edit' || mode === 'view')) {
        setFormData({
          name: karmi.name,
          phone: karmi.phone,
          workingArea: karmi.workingArea,
          status: karmi.status,
          joinDate: karmi.joinDate,
          lastActive: karmi.lastActive,
          totalCollections: karmi.totalCollections,
          rating: karmi.rating
        });
      } else {
        // Reset form for add mode
        setFormData({
          name: '',
          phone: '',
          workingArea: '',
          status: 'Active',
          joinDate: new Date().toISOString().split('T')[0],
          lastActive: new Date().toISOString(),
          totalCollections: 0,
          rating: 5
        });
      }
      setErrors({});
    }
  }, [isOpen, karmi, mode]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }

    if (!formData.workingArea) {
      newErrors.workingArea = 'Working area is required';
    }

    if (!formData.joinDate) {
      newErrors.joinDate = 'Join date is required';
    }

    if (formData.rating < 1 || formData.rating > 5) {
      newErrors.rating = 'Rating must be between 1 and 5';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === 'view') return;

    if (!validateForm()) return;

    setIsSubmitting(true);
    
    try {
      if (mode === 'add') {
        await onSave(formData);
      } else if (mode === 'edit' && karmi) {
        await onUpdate?.(karmi.id, formData);
      }
      onClose();
    } catch (error) {
      console.error('Error saving safai karmi:', error);
      // Don't close modal on error, let user retry
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (!isOpen) return null;

  const isViewMode = mode === 'view';
  // const isEditMode = mode === 'edit';

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-2/3 lg:w-1/2 shadow-lg rounded-md bg-white">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">
            {mode === 'add' && 'Add New Safai Karmi'}
            {mode === 'edit' && 'Edit Safai Karmi'}
            {mode === 'view' && 'Safai Karmi Details'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User className="h-4 w-4 inline mr-2" />
              Full Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              disabled={isViewMode}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 placeholder:text-black text-black ${
                errors.name ? 'border-red-300' : 'border-gray-300'
              } ${isViewMode ? 'bg-gray-50' : 'bg-white'}`}
              placeholder="Enter full name"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.name}
              </p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Phone className="h-4 w-4 inline mr-2" />
              Phone Number
            </label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              disabled={isViewMode}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 placeholder:text-black text-black ${
                errors.phone ? 'border-red-300' : 'border-gray-300'
              } ${isViewMode ? 'bg-gray-50' : 'bg-white'}`}
              placeholder="Enter phone number"
            />
            {errors.phone && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.phone}
              </p>
            )}
          </div>

          {/* Working Area */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MapPin className="h-4 w-4 inline mr-2" />
              Working Area
            </label>
            <input
              type="text"
              value={formData.workingArea}
              onChange={(e) => handleInputChange('workingArea', e.target.value)}
              disabled={isViewMode}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 placeholder:text-black text-black ${
                errors.workingArea ? 'border-red-300' : 'border-gray-300'
              } ${isViewMode ? 'bg-gray-50' : 'bg-white'}`}
              placeholder="Enter working area"
            />
            {errors.workingArea && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.workingArea}
              </p>
            )}
          </div>

          {/* Status and Join Date Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                disabled={isViewMode}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                  isViewMode ? 'bg-gray-50' : 'bg-white'
                } border-gray-300`}
              >
                <option value="Active">Active</option>
                <option value="On Leave">On Leave</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            {/* Join Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="h-4 w-4 inline mr-2" />
                Join Date
              </label>
              <input
                type="date"
                value={formData.joinDate}
                onChange={(e) => handleInputChange('joinDate', e.target.value)}
                disabled={isViewMode}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 placeholder:text-black text-black ${
                  errors.joinDate ? 'border-red-300' : 'border-gray-300'
                } ${isViewMode ? 'bg-gray-50' : 'bg-white'}`}
              />
              {errors.joinDate && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.joinDate}
                </p>
              )}
            </div>
          </div>

          {/* Performance Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Total Collections */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Total Collections
              </label>
              <input
                type="number"
                value={formData.totalCollections}
                onChange={(e) => handleInputChange('totalCollections', parseInt(e.target.value) || 0)}
                disabled={isViewMode}
                min="0"
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 placeholder:text-black text-black ${
                  isViewMode ? 'bg-gray-50' : 'bg-white'
                } border-gray-300`}
              />
            </div>

            {/* Rating */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Star className="h-4 w-4 inline mr-2" />
                Rating
              </label>
              <input
                type="number"
                value={formData.rating}
                onChange={(e) => handleInputChange('rating', parseFloat(e.target.value) || 0)}
                disabled={isViewMode}
                min="1"
                max="5"
                step="0.1"
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 placeholder:text-black text-black ${
                  errors.rating ? 'border-red-300' : 'border-gray-300'
                } ${isViewMode ? 'bg-gray-50' : 'bg-white'}`}
              />
              {errors.rating && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.rating}
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {isViewMode ? 'Close' : 'Cancel'}
            </button>
            {!isViewMode && (
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSubmitting ? 'Saving...' : (mode === 'add' ? 'Add Safai Karmi' : 'Update Safai Karmi')}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
