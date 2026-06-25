const mapError = (rawMessage, status) => {
  if (!rawMessage) {
    if (status === 401) return 'Incorrect email or password.';
    if (status === 404) return null;
    if (status === 503) return 'Server is not configured correctly.';
    if (status === 504) return 'Request timed out. Try again.';
    return 'Something went wrong. Please try again.';
  }

  const firstLine = rawMessage.split('\n')[0];

  if (firstLine.includes('SecurityException: Unknown account')) return 'No account with that email.';
  if (firstLine.includes('SecurityException: User authorization failed')) return 'Incorrect email or password.';
  if (firstLine.includes('SecurityException: Unsupported authorization scheme')) return 'Session expired. Please sign in again.';
  if (firstLine.includes('SecurityException: Token has expired')) return 'This link has expired.';
  if (firstLine.includes('SecurityException: Invalid signature')) return 'Invalid or expired link.';
  if (firstLine.includes('GeneralSecurityException: Unable to authenticate with the OpenID')) return 'Single sign-on failed. Try again.';
  if (firstLine.includes('GeneralSecurityException: Your OpenID Groups do not permit access')) return "Your account isn't permitted to access this app.";
  if (firstLine.includes('GeneralSecurityException: Malformed OpenID callback')) return 'Single sign-on failed. Try again.';
  if (firstLine.includes('SecurityException: Administrator access required')) return "You don't have permission to do that.";
  if (firstLine.includes('SecurityException: Manager access required')) return "You don't have permission to do that.";
  if (firstLine.includes('SecurityException: Operation restricted')) return "This action isn't allowed.";
  if (firstLine.includes('SecurityException: Write access denied')) return 'Your account is read-only.';
  if (firstLine.includes('SecurityException: User access denied')) return "You don't have access to that.";
  if (firstLine.includes('SecurityException: access denied')) return "You don't have access to this item.";
  if (firstLine.includes('SecurityException: Registration disabled')) return 'Registration is currently disabled.';
  if (firstLine.includes('SecurityException: Manager user limit reached')) return 'User limit reached for your account.';
  if (firstLine.includes('SecurityException: One-time password key is required')) return 'Two-factor setup is required.';
  if (firstLine.includes('SecurityException: One-time password is disabled')) return 'Two-factor authentication is unavailable.';
  if (firstLine.includes('SecurityException: Sharing is disabled')) return 'Sharing is disabled.';
  if (firstLine.includes('SecurityException: Temporary user')) return "Temporary accounts can't share devices.";
  if (firstLine.includes('IllegalArgumentException: Unsupported image type')) return 'Unsupported image format.';
  if (firstLine.includes('IllegalArgumentException: Image size limit exceeded')) return 'Image is too large.';
  if (firstLine.includes('IllegalArgumentException: Invalid unique id')) return 'Invalid device identifier.';
  if (firstLine.includes('SecurityException: is disabled') || firstLine.includes('SecurityException:') && firstLine.includes('is disabled')) return 'This account or device is disabled.';
  if (firstLine.includes('SecurityException: is expired') || firstLine.includes('SecurityException:') && firstLine.includes('has expired')) return 'This account or device has expired.';
  if (firstLine.includes('RuntimeException: SMS not configured')) return 'SMS is not configured on the server.';
  if (firstLine.includes('RuntimeException: Command') && firstLine.includes('is not supported')) return "This device doesn't support that command.";
  if (firstLine.includes('RuntimeException: Failed to send command')) return "Couldn't reach the device. Try again.";
  if (firstLine.includes('IllegalArgumentException: Cycle in group hierarchy')) return "A group can't be inside itself.";
  if (firstLine.includes('StorageException')) return "Couldn't save — check for duplicates or missing fields.";
  if (firstLine.includes('DatabaseLockException')) return 'Server is busy, try again shortly.';
  if (firstLine.includes('IllegalArgumentException: Latitude out of range')) return 'Invalid coordinates.';
  if (firstLine.includes('IllegalArgumentException: Longitude out of range')) return 'Invalid coordinates.';
  if (firstLine.includes('ParseException: Unknown geometry type')) return 'Invalid geofence shape.';
  if (firstLine.includes('IllegalArgumentException: Unsupported Temporal type')) return 'Invalid calendar data.';
  if (firstLine.includes('IllegalArgumentException: Time period exceeds the limit')) return 'The selected date range is too large.';
  if (firstLine.includes('RuntimeException: Failed to get notificator')) return 'That notification channel is unavailable.';
  if (firstLine.includes('MessagingException: No SMTP configuration found')) return 'Email is not configured on the server.';
  if (firstLine.includes('MessagingException: Email address issue')) return 'Invalid email address.';
  if (firstLine.includes('RuntimeException: Reverse geocoding is not enabled')) return 'Address lookup is disabled.';
  if (firstLine.includes('Invalid VIN')) return rawMessage; // show as-is
  if (firstLine.includes('VIN decode request timed out')) return 'VIN lookup timed out. Try again.';
  if (firstLine.includes('Error processing VIN decode request')) return 'VIN lookup failed.';
  if (firstLine.includes('Query cannot be empty')) return rawMessage; // show as-is
  if (firstLine.includes('Overpass API request timed out')) return 'Toll lookup timed out.';
  if (firstLine.includes('Error fetching toll data')) return 'Toll lookup failed.';
  if (status === 503) return 'Server is not configured correctly.';
  if (status === 504) return 'Request timed out. Try again.';
  return 'Something went wrong. Please try again.';
};

export default mapError;