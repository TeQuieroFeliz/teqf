'use client';

import { useAuthContext } from '@/context/AuthContext';
import { XCircle, Clock, Check } from 'lucide-react';

function StatusComp() {
  const { currentUser } = useAuthContext();

  // Handle loading state
  if (!currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse flex items-center gap-4 p-6 bg-gray-50 rounded-2xl border border-gray-200 shadow-lg">
          <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
          <div className="h-5 bg-gray-300 rounded w-40"></div>
        </div>
      </div>
    );
  }

  // Status configuration
  const getStatusConfig = (status: 'pending' | 'approved' | 'rejected') => {
    const configs = {
      pending: {
        icon: Clock,
        color: 'text-amber-600',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200',
        label: 'Pending Review',
        description:
          "Your account is under review. We'll notify you once the verification process is complete.",
      },
      rejected: {
        icon: XCircle,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        label: 'Account Rejected',
        description:
          'Your account was not approved. Please contact support for more information.',
      },
      approved: {
        icon: Check,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        label: 'Account Approved',
        description: 'Your account has been approved successfully.',
      },
    };

    return configs[status];
  };

  const statusConfig = getStatusConfig(currentUser.status);
  const StatusIcon = statusConfig.icon;

  return (
    <div
      className={`flex items-start gap-4 max-w-lg w-full p-6 rounded-2xl border transition-all duration-200 shadow-xl ${statusConfig.bgColor} ${statusConfig.borderColor}`}
    >
      <StatusIcon
        className={`w-8 h-8 mt-1 flex-shrink-0 ${statusConfig.color}`}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-2">
          <h3 className="text-lg font-semibold text-gray-900">
            Account Status
          </h3>
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusConfig.color} ${statusConfig.bgColor} border ${statusConfig.borderColor}`}
          >
            {statusConfig.label}
          </span>
        </div>

        <p className="text-base text-gray-700 leading-relaxed">
          {statusConfig.description}
        </p>

        {currentUser.email && (
          <p className="text-sm text-gray-500 mt-3 truncate">
            {currentUser.email}
          </p>
        )}
      </div>
    </div>
  );
}

export default StatusComp;
