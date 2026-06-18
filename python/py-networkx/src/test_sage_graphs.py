import networkx as nx
from networkx.algorithms import isomorphism as iso


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

weighted = nx.Graph()
weighted.add_weighted_edges_from(
    [
        ("s", "a", 3),
        ("s", "b", 2),
        ("a", "b", 1),
        ("a", "t", 2),
        ("b", "t", 4),
    ]
)
assert nx.shortest_path(weighted, "s", "t", weight="weight") == ["s", "a", "t"]
assert nx.shortest_path_length(weighted, "s", "t", weight="weight") == 5

flow = nx.DiGraph()
flow.add_edge("s", "a", capacity=3)
flow.add_edge("s", "b", capacity=2)
flow.add_edge("a", "b", capacity=1)
flow.add_edge("a", "t", capacity=2)
flow.add_edge("b", "t", capacity=4)
assert nx.maximum_flow_value(flow, "s", "t") == 5
assert nx.minimum_cut_value(flow, "s", "t") == 5

colors = nx.coloring.greedy_color(nx.cycle_graph(5), strategy="largest_first")
assert len(set(colors.values())) == 3
assert all(colors[u] != colors[v] for u, v in nx.cycle_graph(5).edges())

independent = set(nx.maximal_independent_set(nx.path_graph(5), seed=1))
assert independent == {1, 3}
assert all(not ({u, v} <= independent) for u, v in nx.path_graph(5).edges())

grid = nx.cartesian_product(nx.path_graph(2), nx.path_graph(3))
assert grid.number_of_nodes() == 6
assert grid.number_of_edges() == 7

left = nx.Graph()
left.add_node(1, color="red")
left.add_node(2, color="blue")
left.add_edge(1, 2, kind="edge")
right = nx.Graph()
right.add_node("a", color="red")
right.add_node("b", color="blue")
right.add_edge("a", "b", kind="edge")
assert nx.is_isomorphic(
    left,
    right,
    node_match=iso.categorical_node_match("color", None),
    edge_match=iso.categorical_edge_match("kind", None),
)

print(
    "networkx-ok path connected-components dag isomorphism "
    "weighted-shortest-path flow coloring independent-set product"
)
