import asyncio
import json


class StatusManager:
    def __init__(self) -> None:
        self._connections: dict[str, set] = {}

    async def connect(self, analysis_id: str, websocket) -> None:
        await websocket.accept()
        self._connections.setdefault(analysis_id, set()).add(websocket)

    def disconnect(self, analysis_id: str, websocket) -> None:
        self._connections.get(analysis_id, set()).discard(websocket)

    async def publish(self, analysis_id: str, event: dict) -> None:
        connections = list(self._connections.get(analysis_id, set()))
        if connections:
            await asyncio.gather(*(connection.send_text(json.dumps(event)) for connection in connections), return_exceptions=True)


status_manager = StatusManager()