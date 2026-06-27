import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

const AccountRedirect = () => {
  const currentUser = useSelector((state) => state.session.user);
  if (!currentUser) return <Navigate to="/login" replace />;
  return <Navigate to={`/settings/user/${currentUser.id}`} replace />;
};

export default AccountRedirect;