import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
});

// Subscribe to realtime messages for a room
export const subscribeToRoom = (roomId, onNewMessage) => {
  const channel = supabase
    .channel(`room:${roomId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `room_id=eq.${roomId}`
      },
      (payload) => {
        console.log('New message received:', payload.new);
        onNewMessage(payload.new);
      }
    )
    .subscribe((status) => {
      console.log('Subscription status:', status);
    });

  return channel;
};

// Unsubscribe from room
export const unsubscribeFromRoom = (channel) => {
  if (channel) {
    supabase.removeChannel(channel);
  }
};

// Subscribe to room updates (for room list)
export const subscribeToRoomUpdates = (userId, onRoomUpdate) => {
  const channel = supabase
    .channel('room-updates')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'chat_rooms'
      },
      (payload) => {
        console.log('Room update:', payload);
        onRoomUpdate(payload);
      }
    )
    .subscribe();

  return channel;
};

export default supabase;
