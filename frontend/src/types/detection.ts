export type MediaType = "image" | "video";

export interface DetectionResult {
  filename: string;
  media_type: MediaType;
  face_detected: boolean;
  analysis_performed: boolean;
  warning: string | null;
  is_deepfake: boolean;
  label: string;
  confidence: number;
  real_confidence: number;
  fake_confidence: number;
  message: string;
  gradcam_image: string | null;
  frames_analyzed: number | null;
  frames_sampled: number | null;
  video_duration_seconds: number | null;
  gradcam_frame_index: number | null;
  gradcam_timestamp_seconds: number | null;
}
