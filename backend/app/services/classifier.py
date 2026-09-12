from dataclasses import dataclass
from threading import Lock


from app.core.config import Settings


class ModelNotConfiguredError(RuntimeError):
    pass


@dataclass(frozen=True)
class ClassificationResult:
    label: str
    class_probabilities: dict[str, float]
    email_phishing_probability: float | None
    url_phishing_probability: float
    confidence: float
    model_name: str


class DistilBertClassifier:
    SEMANTIC_LABELS = {
        0: "legitimate_email",
        1: "phishing_url",
        2: "legitimate_url",
        3: "phishing_url_alt",
    }

    def __init__(self, settings: Settings) -> None:
        if not settings.model_name.strip():
            raise ModelNotConfiguredError("SANDBOXTRACE_MODEL_NAME must identify a configured DistilBERT model")
        self.settings = settings
        self._tokenizer = None
        self._model = None
        self._lock = Lock()

    def _load(self) -> None:
        if self._model is not None:
            return
        with self._lock:
            if self._model is None:
                from transformers import AutoModelForSequenceClassification, AutoTokenizer

                load_kwargs = {"revision": self.settings.model_revision} if self.settings.model_revision else {}
                self._tokenizer = AutoTokenizer.from_pretrained(self.settings.model_name, **load_kwargs)
                self._model = AutoModelForSequenceClassification.from_pretrained(self.settings.model_name, **load_kwargs)
                self._model.eval()

    def classify(self, text: str) -> ClassificationResult:
        import torch

        self._load()
        assert self._tokenizer is not None and self._model is not None
        inputs = self._tokenizer(text, return_tensors="pt", truncation=True, max_length=512)
        with torch.inference_mode():
            logits = self._model(**inputs).logits
            probabilities = torch.softmax(logits, dim=-1)[0]
        semantic_labels = self.SEMANTIC_LABELS
        if len(probabilities) != len(semantic_labels):
            raise ValueError(f"Expected four model classes, received {len(probabilities)}")
        class_probabilities = {semantic_labels[index]: float(probabilities[index]) for index in semantic_labels}
        prediction_index = int(torch.argmax(probabilities).item())
        return ClassificationResult(
            label=semantic_labels[prediction_index],
            class_probabilities=class_probabilities,
            email_phishing_probability=None,
            url_phishing_probability=class_probabilities["phishing_url"] + class_probabilities["phishing_url_alt"],
            confidence=float(probabilities[prediction_index]),
            model_name=self.settings.model_name,
        )
