include ../build/Makefile-vars

all: deps wasm

VERSION = 3.6.1
WHEEL = networkx-${VERSION}-py3-none-any.whl
URL = https://files.pythonhosted.org/packages/9e/c9/b2622292ea83fbb4ec318f5b9ab867d0a28ab43c5717bb85b0a5f6b3b0a4/${WHEEL}
TARBALL = ${UPSTREAM}/${WHEEL}
TARBALL_SHA256 = d47fbf302e7d9cbbb9e2555a0d267983d2aa476bac30e90dfbe5669bd57f3762

include ../build/Makefile-vars-wheel

TOP_LEVEL = networkx

test: deps ${DIST_WASM}/.built
	PYTHONPATH=${DIST_WASM} pnpm-exec cpython -c 'import networkx as nx; g = nx.path_graph(5); assert nx.shortest_path(g, 0, 4) == [0, 1, 2, 3, 4]; assert sorted(nx.connected_components(g)) == [{0, 1, 2, 3, 4}]; dag = nx.DiGraph([(1, 3), (2, 3), (3, 4)]); order = list(nx.topological_sort(dag)); assert order.index(3) > order.index(1) and order.index(3) > order.index(2); assert nx.is_isomorphic(nx.cycle_graph(4), nx.Graph([(10, 11), (11, 12), (12, 13), (13, 10)]))'
