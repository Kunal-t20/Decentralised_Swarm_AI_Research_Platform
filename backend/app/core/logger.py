"""
Centralized logging configuration for the Swarm Research Platform.

Usage (in any module):
    from app.core.logger import get_logger
    logger = get_logger(__name__)
    logger.info("Something happened")

Log files are written to:  backend/logs/swarm.log   (rotating, midnight, 7 days)
Console output:            INFO+ with level-color prefixes, shown in uvicorn terminal
"""

import logging
import logging.handlers
import sys
from pathlib import Path

# ── Paths ──────────────────────────────────────────────────────────────────────
# parents[2] == backend/   (logger.py -> core/ -> app/ -> backend/)
_LOG_DIR = Path(__file__).resolve().parents[2] / "logs"
_LOG_DIR.mkdir(parents=True, exist_ok=True)
_LOG_FILE = _LOG_DIR / "swarm.log"

# ── Format strings ─────────────────────────────────────────────────────────────
_FILE_FMT    = "%(asctime)s  %(levelname)-8s  [%(name)s]  %(message)s"
_CONSOLE_FMT = "%(asctime)s  %(levelname)-8s  [%(name)s]  %(message)s"
_DATE_FMT    = "%Y-%m-%d %H:%M:%S"


class _FlushingStreamHandler(logging.StreamHandler):
    """
    StreamHandler that:
    - resolves sys.stdout at emit-time (works correctly inside uvicorn child processes)
    - forces a flush after every record so lines appear immediately in the terminal
    """

    def emit(self, record: logging.LogRecord) -> None:
        try:
            msg = self.format(record)
            # Write directly to sys.stdout so we always use the live fd,
            # even if uvicorn or the reloader swaps the stream out later.
            stream = sys.stdout
            stream.write(msg + self.terminator)
            stream.flush()
        except Exception:
            self.handleError(record)


def _build_root_logger() -> logging.Logger:
    root = logging.getLogger("swarm")
    if root.handlers:
        # Already configured – happens on uvicorn --reload hot-swaps
        return root

    root.setLevel(logging.DEBUG)

    # ── Console handler: INFO+, plain text, flushed after every line ───────────
    console_handler = _FlushingStreamHandler()
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(logging.Formatter(fmt=_CONSOLE_FMT, datefmt=_DATE_FMT))
    root.addHandler(console_handler)

    # ── Rotating file handler: DEBUG+, UTF-8, midnight rotation ───────────────
    file_handler = logging.handlers.TimedRotatingFileHandler(
        filename=_LOG_FILE,
        when="midnight",      # new file every day
        backupCount=7,        # keep 7 days
        encoding="utf-8",
        delay=False,
    )
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(logging.Formatter(fmt=_FILE_FMT, datefmt=_DATE_FMT))
    root.addHandler(file_handler)

    # Don't bubble up to the root Python logger (avoids duplicate uvicorn lines)
    root.propagate = False

    root.info("=" * 72)
    root.info("Swarm Research Platform - logging initialised")
    root.info("Log file : %s", _LOG_FILE)
    root.info("=" * 72)

    return root


# Build once when the module is first imported
_root_swarm_logger = _build_root_logger()


def get_logger(name: str) -> logging.Logger:
    """
    Return a child logger namespaced under 'swarm'.

    Example:
        logger = get_logger(__name__)
        # 'app.swarm.nodes.researcher'  ->  swarm.swarm.nodes.researcher
    """
    short = name.removeprefix("app.")
    return _root_swarm_logger.getChild(short)
