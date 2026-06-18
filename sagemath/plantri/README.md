# Plantri For SageMath

This package builds `plantri` and `fullgen`, graph generators used by SageMath
for planar graph and fullerene generation. It also installs the upstream
`plantri` plugin variants that Sage may call for filtered generation and
summary statistics:

- `plantri_nft`
- `plantri_adj4`
- `plantri_maxd`
- `plantri_mdcount`
- `plantri_ad`
- `plantri_deg`
- `plantri_fo`

The CoWasm package currently provides a wasi-sdk standalone smoke build of the
upstream command-line programs. The smoke test runs the base generators and
checks deterministic output from the degree-sequence and minimum-degree count
plugin variants.
