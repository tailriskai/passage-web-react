import { useContext } from "react";
import { PassageContext } from "./Provider";
import type { PassageContextValue } from "./types";

export const usePassage = (): PassageContextValue => {
  const context = useContext(PassageContext);

  if (!context) {
    throw new Error(
      "usePassage must be used within a PassageProvider. " +
        "Make sure to wrap your app with <PassageProvider>."
    );
  }

  return context;
};
