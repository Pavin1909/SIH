import logging

from app.core.config import Settings

logger = logging.getLogger(__name__)


class GraphResult:
    def __init__(self, status: str, node_count: int = 0, relationship_count: int = 0) -> None:
        self.status = status
        self.node_count = node_count
        self.relationship_count = relationship_count


class CampaignGraph:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def upsert(self, run_id: str, observations: list[dict], campaign_key: str) -> GraphResult:
        try:
            from neo4j import GraphDatabase

            auth = (self.settings.neo4j_user, self.settings.neo4j_password) if self.settings.neo4j_password else None
            driver = GraphDatabase.driver(self.settings.neo4j_uri, auth=auth)
            with driver.session() as session:
                session.run("MERGE (r:ForensicRun {id: $run_id})", run_id=run_id).consume()
                for item in observations:
                    if not item.get("domain") and not item.get("ip"):
                        continue
                    session.run(
                        "MERGE (c:Campaign {key: $campaign_key}) "
                        "MERGE (r:ForensicRun {id: $run_id}) "
                        "MERGE (r)-[:OBSERVED_IN]->(c) "
                        "MERGE (i:Infrastructure {domain: $domain, ip: $ip}) "
                        "MERGE (r)-[:OBSERVED]->(i)",
                        campaign_key=campaign_key,
                        run_id=run_id,
                        domain=item.get("domain"),
                        ip=item.get("ip"),
                    ).consume()
            driver.close()
            return GraphResult("ok", len(observations) + 2, len(observations) * 2)
        except Exception as exc:
            logger.warning("Neo4j graph update unavailable: %s", exc)
            return GraphResult("error")
