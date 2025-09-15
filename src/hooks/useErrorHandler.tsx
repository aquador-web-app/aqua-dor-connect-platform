import { useToast } from "@/hooks/use-toast";

interface ErrorHandlerOptions {
  showToast?: boolean;
  logError?: boolean;
  title?: string;
}

export const useErrorHandler = () => {
  const { toast } = useToast();

  const handleError = (
    error: any, 
    options: ErrorHandlerOptions = { showToast: true, logError: false }
  ) => {
    const { showToast = true, logError = false, title = "Une erreur s'est produite" } = options;
    
    if (logError && process.env.NODE_ENV === 'development') {
      console.error(title, error);
    }

    if (showToast) {
      toast({
        title,
        description: error?.message || "Une erreur inattendue s'est produite",
        variant: "destructive"
      });
    }
  };

  const handleSuccess = (
    title: string,
    description?: string
  ) => {
    toast({
      title,
      description,
      variant: "default"
    });
  };

  return { handleError, handleSuccess };
};