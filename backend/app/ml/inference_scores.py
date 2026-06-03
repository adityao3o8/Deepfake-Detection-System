from __future__ import annotations

from dataclasses import dataclass

CLASS_REAL = 0
CLASS_FAKE = 1


@dataclass(frozen=True)
class InferenceScores:
    real_confidence: float
    fake_confidence: float

    @property
    def is_deepfake(self) -> bool:
        return self.fake_confidence >= self.real_confidence

    @property
    def confidence(self) -> float:
        return max(self.real_confidence, self.fake_confidence)

    @property
    def label(self) -> str:
        return "fake" if self.is_deepfake else "real"
