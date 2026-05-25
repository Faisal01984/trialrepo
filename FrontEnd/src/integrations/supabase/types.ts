export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      homework_submissions: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_type: string | null
          id: string
          lesson_id: string
          notes: string | null
          student_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_type?: string | null
          id?: string
          lesson_id: string
          notes?: string | null
          student_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_type?: string | null
          id?: string
          lesson_id?: string
          notes?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "homework_submissions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          content: Json
          created_at: string
          difficulty: string
          duration: number
          grade: string
          id: string
          language: string
          objectives: string | null
          subject: string
          target_grade: string
          teacher_id: string
          title: string
          topic: string
          updated_at: string
        }
        Insert: {
          content?: Json
          created_at?: string
          difficulty?: string
          duration?: number
          grade: string
          id?: string
          language?: string
          objectives?: string | null
          subject: string
          target_grade?: string
          teacher_id: string
          title: string
          topic: string
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          difficulty?: string
          duration?: number
          grade?: string
          id?: string
          language?: string
          objectives?: string | null
          subject?: string
          target_grade?: string
          teacher_id?: string
          title?: string
          topic?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          lesson_id: string | null
          lesson_title: string | null
          message: string | null
          subject: string | null
          target_level: string | null
          teacher_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lesson_id?: string | null
          lesson_title?: string | null
          message?: string | null
          subject?: string | null
          target_level?: string | null
          teacher_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lesson_id?: string | null
          lesson_title?: string | null
          message?: string | null
          subject?: string | null
          target_level?: string | null
          teacher_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          assigned_grade: string | null
          avatar_url: string | null
          created_at: string
          email_notifications: boolean
          full_name: string | null
          id: string
          roll_number: string | null
          special_class: boolean
          updated_at: string
        }
        Insert: {
          assigned_grade?: string | null
          avatar_url?: string | null
          created_at?: string
          email_notifications?: boolean
          full_name?: string | null
          id: string
          roll_number?: string | null
          special_class?: boolean
          updated_at?: string
        }
        Update: {
          assigned_grade?: string | null
          avatar_url?: string | null
          created_at?: string
          email_notifications?: boolean
          full_name?: string | null
          id?: string
          roll_number?: string | null
          special_class?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          answers: Json
          created_at: string
          id: string
          lesson_id: string
          score: number
          student_id: string
          total: number
        }
        Insert: {
          answers?: Json
          created_at?: string
          id?: string
          lesson_id: string
          score?: number
          student_id: string
          total?: number
        }
        Update: {
          answers?: Json
          created_at?: string
          id?: string
          lesson_id?: string
          score?: number
          student_id?: string
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      student_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          notification_id: string
          student_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          notification_id: string
          student_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          notification_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_notifications_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_integrations: {
        Row: {
          teacher_id: string
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          teacher_id: string
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          teacher_id?: string
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      count_lessons_for_viewer: { Args: never; Returns: number }
      get_assigned_grade: { Args: { _user_id: string }; Returns: string }
      get_lesson_for_viewer: {
        Args: { _lesson_id: string }
        Returns: {
          content: Json
          created_at: string
          difficulty: string
          duration: number
          grade: string
          id: string
          language: string
          objectives: string | null
          subject: string
          target_grade: string
          teacher_id: string
          title: string
          topic: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "lessons"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_lesson_full: {
        Args: { _lesson_id: string }
        Returns: {
          content: Json
          created_at: string
          difficulty: string
          duration: number
          grade: string
          id: string
          language: string
          objectives: string | null
          subject: string
          target_grade: string
          teacher_id: string
          title: string
          topic: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "lessons"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_lesson_students: {
        Args: { _lesson_id: string }
        Returns: {
          full_name: string
          id: string
          roll_number: string
        }[]
      }
      get_students_by_level: {
        Args: { _level: string }
        Returns: {
          id: string
        }[]
      }
      get_teacher_progress: {
        Args: never
        Returns: {
          assigned_grade: string
          avg_score: number
          full_name: string
          homework: number
          quizzes: number
          student_id: string
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_special_class: { Args: { _user_id: string }; Returns: boolean }
      list_lessons_for_viewer: {
        Args: never
        Returns: {
          created_at: string
          difficulty: string
          duration: number
          grade: string
          id: string
          language: string
          objectives: string
          subject: string
          target_grade: string
          teacher_id: string
          title: string
          topic: string
          updated_at: string
        }[]
      }
      set_student_level: {
        Args: { _ai_class: boolean; _level: string; _student_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "teacher" | "student"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["teacher", "student"],
    },
  },
} as const
