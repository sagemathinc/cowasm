# Benzene For SageMath

Benzene generates fusenes and benzenoids with a fixed number of hexagonal
faces. SageMath can use it as an optional graph generator for chemical graph
families.

This package builds the upstream `benzene` command as a wasi-sdk standalone
executable. The smoke test exercises planar-code output, BECode output, and
benzenoid-restricted generation under the WASI runner.
