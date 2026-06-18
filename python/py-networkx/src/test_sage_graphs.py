import networkx as nx


path = nx.path_graph(5)
assert nx.shortest_path(path, 0, 4) == [0, 1, 2, 3, 4]
assert sorted(nx.connected_components(path), key=len) == [{0, 1, 2, 3, 4}]

dag = nx.DiGraph([(1, 3), (2, 3), (3, 4)])
order = list(nx.topological_sort(dag))
assert order.index(3) > order.index(1)
assert order.index(3) > order.index(2)

cycle = nx.cycle_graph(4)
renamed_cycle = nx.Graph([(10, 11), (11, 12), (12, 13), (13, 10)])
assert nx.is_isomorphic(cycle, renamed_cycle)

print("networkx-ok path connected-components dag isomorphism")
