export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      capsulas: {
        Row: {
          anclada: boolean | null
          descripcion: string | null
          enlace_publico: string | null
          fecha_creacion: string | null
          id: string
          portada_url: string | null
          publica: boolean | null
          tipo: string | null
          titulo: string | null
          usuario_id: string | null
        }
        Insert: {
          anclada?: boolean | null
          descripcion?: string | null
          enlace_publico?: string | null
          fecha_creacion?: string | null
          id?: string
          portada_url?: string | null
          publica?: boolean | null
          tipo?: string | null
          titulo?: string | null
          usuario_id?: string | null
        }
        Update: {
          anclada?: boolean | null
          descripcion?: string | null
          enlace_publico?: string | null
          fecha_creacion?: string | null
          id?: string
          portada_url?: string | null
          publica?: boolean | null
          tipo?: string | null
          titulo?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "capsulas_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      capsule_contributors: {
        Row: {
          added_at: string
          capsule_id: string
          id: string
          invitation_id: string | null
          is_visible: boolean
          role: string
          user_id: string
        }
        Insert: {
          added_at?: string
          capsule_id: string
          id?: string
          invitation_id?: string | null
          is_visible?: boolean
          role?: string
          user_id: string
        }
        Update: {
          added_at?: string
          capsule_id?: string
          id?: string
          invitation_id?: string | null
          is_visible?: boolean
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "capsule_contributors_capsule_id_fkey"
            columns: ["capsule_id"]
            isOneToOne: false
            referencedRelation: "capsulas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capsule_contributors_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "capsule_invitations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capsule_contributors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      capsule_invitations: {
        Row: {
          capsule_id: string
          created_at: string
          expires_at: string | null
          id: string
          invitee_email: string | null
          inviter_user_id: string
          message: string | null
          share_token: string
          status: string
        }
        Insert: {
          capsule_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          invitee_email?: string | null
          inviter_user_id: string
          message?: string | null
          share_token?: string
          status?: string
        }
        Update: {
          capsule_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          invitee_email?: string | null
          inviter_user_id?: string
          message?: string | null
          share_token?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "capsule_invitations_capsule_id_fkey"
            columns: ["capsule_id"]
            isOneToOne: false
            referencedRelation: "capsulas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capsule_invitations_inviter_user_id_fkey"
            columns: ["inviter_user_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      comentarios: {
        Row: {
          capsula_id: string | null
          contenido: string
          fecha: string | null
          id: string
          recuerdo_id: string | null
          usuario_id: string | null
        }
        Insert: {
          capsula_id?: string | null
          contenido: string
          fecha?: string | null
          id?: string
          recuerdo_id?: string | null
          usuario_id?: string | null
        }
        Update: {
          capsula_id?: string | null
          contenido?: string
          fecha?: string | null
          id?: string
          recuerdo_id?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comentarios_capsula_id_fkey"
            columns: ["capsula_id"]
            isOneToOne: false
            referencedRelation: "capsulas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comentarios_recuerdo_id_fkey"
            columns: ["recuerdo_id"]
            isOneToOne: false
            referencedRelation: "recuerdos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comentarios_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      contribuciones: {
        Row: {
          capsula_id: string | null
          comentario: string | null
          fecha: string | null
          fuente: string | null
          id: string
          latitud: number | null
          longitud: number | null
          nombre_contribuyente: string | null
          tipo: string | null
          url_archivo: string | null
        }
        Insert: {
          capsula_id?: string | null
          comentario?: string | null
          fecha?: string | null
          fuente?: string | null
          id?: string
          latitud?: number | null
          longitud?: number | null
          nombre_contribuyente?: string | null
          tipo?: string | null
          url_archivo?: string | null
        }
        Update: {
          capsula_id?: string | null
          comentario?: string | null
          fecha?: string | null
          fuente?: string | null
          id?: string
          latitud?: number | null
          longitud?: number | null
          nombre_contribuyente?: string | null
          tipo?: string | null
          url_archivo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contribuciones_capsula_id_fkey"
            columns: ["capsula_id"]
            isOneToOne: false
            referencedRelation: "capsulas"
            referencedColumns: ["id"]
          },
        ]
      }
      future_reminder_capsules: {
        Row: {
          capsule_id: string
          reminder_id: string
        }
        Insert: {
          capsule_id: string
          reminder_id: string
        }
        Update: {
          capsule_id?: string
          reminder_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "future_reminder_capsules_reminder_id_fkey"
            columns: ["reminder_id"]
            isOneToOne: false
            referencedRelation: "future_reminders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensajes_programados_capsulas_capsule_id_fkey"
            columns: ["capsule_id"]
            isOneToOne: false
            referencedRelation: "capsulas"
            referencedColumns: ["id"]
          },
        ]
      }
      future_reminder_recuerdos: {
        Row: {
          recuerdo_id: string
          reminder_id: string
        }
        Insert: {
          recuerdo_id: string
          reminder_id: string
        }
        Update: {
          recuerdo_id?: string
          reminder_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "future_reminder_recuerdos_reminder_id_fkey"
            columns: ["reminder_id"]
            isOneToOne: false
            referencedRelation: "future_reminders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensajes_programados_recuerdos_recuerdo_id_fkey"
            columns: ["recuerdo_id"]
            isOneToOne: false
            referencedRelation: "recuerdos"
            referencedColumns: ["id"]
          },
        ]
      }
      future_reminders: {
        Row: {
          access_token: string
          created_at: string
          creator_user_id: string | null
          delivery_method: Database["public"]["Enums"]["delivery_method"]
          id: string
          message: string | null
          recipient_email: string | null
          recipient_name: string | null
          scheduled_delivery_at: string | null
          status: Database["public"]["Enums"]["reminder_status"]
          title: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string
          created_at?: string
          creator_user_id?: string | null
          delivery_method: Database["public"]["Enums"]["delivery_method"]
          id?: string
          message?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          scheduled_delivery_at?: string | null
          status?: Database["public"]["Enums"]["reminder_status"]
          title?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string
          created_at?: string
          creator_user_id?: string | null
          delivery_method?: Database["public"]["Enums"]["delivery_method"]
          id?: string
          message?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          scheduled_delivery_at?: string | null
          status?: Database["public"]["Enums"]["reminder_status"]
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mensajes_programados_creator_user_id_fkey"
            columns: ["creator_user_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      notificaciones: {
        Row: {
          fecha_creacion: string
          id: string
          leida: boolean
          mensaje: string
          metadata: Json | null
          tipo: string
          usuario_id: string
        }
        Insert: {
          fecha_creacion?: string
          id?: string
          leida?: boolean
          mensaje: string
          metadata?: Json | null
          tipo: string
          usuario_id: string
        }
        Update: {
          fecha_creacion?: string
          id?: string
          leida?: boolean
          mensaje?: string
          metadata?: Json | null
          tipo?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificaciones_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos_fisicos: {
        Row: {
          archivo_usado: string | null
          dirección_envío: string | null
          estado_envío: string | null
          fecha_pedido: string | null
          id: string
          país: string | null
          personalización_texto: string | null
          precio_total: number | null
          tipo_producto: string | null
          usuario_id: string | null
        }
        Insert: {
          archivo_usado?: string | null
          dirección_envío?: string | null
          estado_envío?: string | null
          fecha_pedido?: string | null
          id?: string
          país?: string | null
          personalización_texto?: string | null
          precio_total?: number | null
          tipo_producto?: string | null
          usuario_id?: string | null
        }
        Update: {
          archivo_usado?: string | null
          dirección_envío?: string | null
          estado_envío?: string | null
          fecha_pedido?: string | null
          id?: string
          país?: string | null
          personalización_texto?: string | null
          precio_total?: number | null
          tipo_producto?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_fisicos_archivo_usado_fkey"
            columns: ["archivo_usado"]
            isOneToOne: false
            referencedRelation: "recuerdos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_fisicos_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      recuerdos: {
        Row: {
          activo: boolean | null
          anclado: boolean | null
          capsula_id: string | null
          descripcion: string | null
          es_favorito: boolean | null
          fecha_real: string | null
          fecha_subida: string | null
          ia_acceso: boolean | null
          id: string
          latitud: number | null
          limpio_por_ia: boolean | null
          longitud: number | null
          mejorado_por_ia: boolean | null
          nombre_archivo: string | null
          tamaño: number | null
          tipo: string | null
          titulo_personalizado: string | null
          ubicacion_manual: boolean | null
          url_archivo: string
          usuario_id: string | null
        }
        Insert: {
          activo?: boolean | null
          anclado?: boolean | null
          capsula_id?: string | null
          descripcion?: string | null
          es_favorito?: boolean | null
          fecha_real?: string | null
          fecha_subida?: string | null
          ia_acceso?: boolean | null
          id?: string
          latitud?: number | null
          limpio_por_ia?: boolean | null
          longitud?: number | null
          mejorado_por_ia?: boolean | null
          nombre_archivo?: string | null
          tamaño?: number | null
          tipo?: string | null
          titulo_personalizado?: string | null
          ubicacion_manual?: boolean | null
          url_archivo: string
          usuario_id?: string | null
        }
        Update: {
          activo?: boolean | null
          anclado?: boolean | null
          capsula_id?: string | null
          descripcion?: string | null
          es_favorito?: boolean | null
          fecha_real?: string | null
          fecha_subida?: string | null
          ia_acceso?: boolean | null
          id?: string
          latitud?: number | null
          limpio_por_ia?: boolean | null
          longitud?: number | null
          mejorado_por_ia?: boolean | null
          nombre_archivo?: string | null
          tamaño?: number | null
          tipo?: string | null
          titulo_personalizado?: string | null
          ubicacion_manual?: boolean | null
          url_archivo?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recuerdos_capsula_id_fkey"
            columns: ["capsula_id"]
            isOneToOne: false
            referencedRelation: "capsulas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recuerdos_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      usuarios: {
        Row: {
          email: string
          es_activo: boolean | null
          fecha_creacion: string
          id: string
          nombre: string | null
          país: string | null
          plan: string | null
        }
        Insert: {
          email: string
          es_activo?: boolean | null
          fecha_creacion?: string
          id?: string
          nombre?: string | null
          país?: string | null
          plan?: string | null
        }
        Update: {
          email?: string
          es_activo?: boolean | null
          fecha_creacion?: string
          id?: string
          nombre?: string | null
          país?: string | null
          plan?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      delivery_method: "email" | "qr_code"
      reminder_status: "scheduled" | "sent" | "failed" | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      delivery_method: ["email", "qr_code"],
      reminder_status: ["scheduled", "sent", "failed", "cancelled"],
    },
  },
} as const

