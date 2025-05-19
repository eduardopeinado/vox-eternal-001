// src/hooks/useSubscription.ts
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export type Subscription = {
  plan: string;
  status: string;
  current_period_end: string | null;
  current_period_start: string | null; // Alias para started_at
  stripe_subscription_id: string | null;
};

export function useSubscription(userId: string | null) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setSubscription(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from("subscriptions")
      .select("plan, status, started_at, current_period_end, stripe_subscription_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setSubscription(null);
        } else {
          // Mapear started_at a current_period_start para mantener la API interna consistente
          setSubscription({
            ...data,
            current_period_start: data.started_at,
          });
        }
        setLoading(false);
      });
  }, [userId]);

  return { subscription, loading };
}
