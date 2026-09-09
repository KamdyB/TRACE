from dataclasses import asdict
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json

from schemas.contracts import (
    IncomeSeasonalityFlag,
    Transaction,
    TransactionHistoryPayload,
    TransactionType,
)

from scoring.engine import calculate_affordability
from scoring.fraud import detect_fraud_patterns


class TraceHandler(BaseHTTPRequestHandler):

    def _send_json(self, status_code: int, data: dict) -> None:
        body = json.dumps(data).encode("utf-8")

        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()

        self.wfile.write(body)

    def do_GET(self) -> None:
        if self.path == "/api/health":
            self._send_json(200, {"status": "ok"})
            return

        self._send_json(404, {"error": "Not found"})

    def do_POST(self) -> None:
        if self.path != "/api/score":
            self._send_json(404, {"error": "Not found"})
            return

        try:
            content_length = int(self.headers.get("Content-Length", 0))
            raw_body = self.rfile.read(content_length)
            data = json.loads(raw_body)

            payload = self._build_payload(data)

            affordability = calculate_affordability(payload)
            fraud = detect_fraud_patterns(
                payload.consent_id,
                payload.transactions,
            )

            self._send_json(
                200,
                {
                    "affordability": asdict(affordability),
                    "fraud": asdict(fraud),
                },
            )

        except (KeyError, TypeError, ValueError, json.JSONDecodeError) as exc:
            self._send_json(
                400,
                {"error": f"Invalid request: {exc}"},
            )

        except Exception as exc:
            self._send_json(
                500,
                {"error": f"Scoring failed: {exc}"},
            )

    @staticmethod
    def _build_payload(data: dict) -> TransactionHistoryPayload:
        transactions = [
            Transaction(
                txn_id=txn["txn_id"],
                date=txn["date"],
                type=TransactionType(txn["type"]),
                amount=float(txn["amount"]),
                category=txn["category"],
                recurring_pattern_score=float(
                    txn["recurring_pattern_score"]
                ),
            )
            for txn in data["transactions"]
        ]

        return TransactionHistoryPayload(
            consent_id=data["consent_id"],
            account_ref=data["account_ref"],
            period_start=data["period_start"],
            period_end=data["period_end"],
            transactions=transactions,
            income_seasonality_flag=IncomeSeasonalityFlag(
                data["income_seasonality_flag"]
            ),
        )


def run_server() -> None:
    server = ThreadingHTTPServer(
        ("localhost", 8000),
        TraceHandler,
    )

    print("TRACE API running at http://localhost:8000")
    server.serve_forever()


if __name__ == "__main__":
    run_server()