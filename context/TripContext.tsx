import React, { createContext, useState, useContext } from 'react';

const TripContext = createContext<any>(null);

export const TripProvider = ({ children }: any) => {
  const [tripData, setTripData] = useState(null);
  return (
    <TripContext.Provider value={{ tripData, setTripData }}>
      {children}
    </TripContext.Provider>
  );
};

export const useTrip = () => useContext(TripContext);
