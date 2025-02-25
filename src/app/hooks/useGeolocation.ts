import { useState, useEffect } from 'react';

// Custom React hook that uses the browser's Geolocation API.
// It returns the location, any error message, and a loading state.
export const useGeolocation = () => {
  const [location, setLocation] = useState<null | [number, number]>(null);
  const [error, setError] = useState<null | string>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if the browser supports geolocation
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setIsLoading(false);
      return;
    }

    // Request the current position from the browser
    navigator.geolocation.getCurrentPosition(
      (position) => {
        // On success, set the latitude and longitude
        setLocation([position.coords.latitude, position.coords.longitude]);
        setIsLoading(false);
      },
      (error) => {
        // On error, set the error message for debugging
        setError(error.message);
        setIsLoading(false);
      }
    );
  }, []);

  return { location, error, isLoading };
};
