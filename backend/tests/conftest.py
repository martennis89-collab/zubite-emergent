import pytest
import asyncio

pytest_plugins = ["pytest_asyncio"]

# Configure default event loop scope
def pytest_collection_modifyitems(config, items):
    for item in items:
        if asyncio.iscoroutinefunction(getattr(item, "function", None)):
            item.add_marker(pytest.mark.asyncio)
