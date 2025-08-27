import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface InstructorStats {
  totalStudents: number;
  classesThisWeek: number;
  averageRating: number;
  completedSessions: number;
  upcomingSessions: number;
  activeEnrollments: number;
}

export function useInstructorStats() {
  const [stats, setStats] = useState<InstructorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();

  useEffect(() => {
    if (profile?.id) {
      fetchInstructorStats();
    }
  }, [profile?.id]);

  const fetchInstructorStats = async () => {
    try {
      setLoading(true);

      // Get instructor record
      const { data: instructor } = await supabase
        .from('instructors')
        .select('id')
        .eq('profile_id', profile?.id)
        .single();

      if (!instructor) {
        setStats({
          totalStudents: 0,
          classesThisWeek: 0,
          averageRating: 0,
          completedSessions: 0,
          upcomingSessions: 0,
          activeEnrollments: 0
        });
        return;
      }

      const instructorId = instructor.id;
      
      // Calculate date ranges
      const now = new Date();
      const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      // Fetch total active enrollments (students)
      const { data: enrollmentsData } = await supabase
        .from('enrollments')
        .select(`
          student_id,
          classes!inner(instructor_id)
        `)
        .eq('classes.instructor_id', instructorId)
        .eq('status', 'active');

      const totalStudents = enrollmentsData?.length || 0;

      // Fetch sessions this week
      const { count: classesThisWeek } = await supabase
        .from('class_sessions')
        .select('id', { count: 'exact' })
        .eq('instructor_id', instructorId)
        .gte('session_date', weekStart.toISOString())
        .lte('session_date', weekEnd.toISOString());

      // Fetch completed sessions count
      const { count: completedSessions } = await supabase
        .from('class_sessions')
        .select('id', { count: 'exact' })
        .eq('instructor_id', instructorId)
        .eq('status', 'completed');

      // Fetch upcoming sessions count
      const { count: upcomingSessions } = await supabase
        .from('class_sessions')
        .select('id', { count: 'exact' })
        .eq('instructor_id', instructorId)
        .eq('status', 'scheduled')
        .gte('session_date', new Date().toISOString());

      // Fetch average rating
      const { data: reviews } = await supabase
        .from('reviews')
        .select('rating')
        .eq('instructor_id', instructorId);

      const averageRating = reviews && reviews.length > 0
        ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
        : 0;

        setStats({
          totalStudents: totalStudents,
          classesThisWeek: classesThisWeek || 0,
          averageRating: Math.round(averageRating * 10) / 10,
          completedSessions: completedSessions || 0,
          upcomingSessions: upcomingSessions || 0,
          activeEnrollments: totalStudents
        });

    } catch (error) {
      console.error('Error fetching instructor stats:', error);
      setStats({
        totalStudents: 0,
        classesThisWeek: 0,
        averageRating: 0,
        completedSessions: 0,
        upcomingSessions: 0,
        activeEnrollments: 0
      });
    } finally {
      setLoading(false);
    }
  };

  return { stats, loading, refetch: fetchInstructorStats };
}