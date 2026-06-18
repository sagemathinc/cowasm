import hashlib
import os
from pathlib import Path

from database_cubic_hecke import read_basis, read_irr, read_reg, version
from database_cubic_hecke.markov_trace_coeffs import read_markov


root = Path(os.environ["PYTHONPATH"].split(os.pathsep)[0])
package = root / "database_cubic_hecke"

expected_files = {
    "__init__.py": (12_365, "46cc2e8f1f94bf445ea913ee9751a5898201845c2aa032f95d23a5c94f5522ac"),
    "__version__.py": (19, "f989b068e95fc4b5361830dc99604dba2064aa8fb699a57bc83766bd3933ef25"),
    "marin_basis.py": (16_474, "d91c3fd85d4007b2d5a04d9f3a2aad224630f63c9351b1f18e377d23a5550bb9"),
    "marin_irred_reprs.py": (22_110, "8e1261cbf0ee79efcde401ec43f8436d990b42f66f245d06d78f977289930b00"),
    "marin_regl_reprs.py": (516_821, "0d51e23483566d6aeb719dbbba604bdc58365e39c66002e6bdeee0183755008e"),
    "marin_regr_reprs.py": (580_900, "39f3a3b61ec6696cf4ad7c5c81dac2590933d76f5e4a8d86c43a2e03a031a945"),
    "markov_trace_coeffs.py": (51_693, "008b82c4f220bc532b341df3585688441454eae52062499830b9678eec6330ae"),
    "markov_trace_coeffs_irr.py": (939_146, "aef5531e0e16e4b6cc0611285750873c0892c014fb28ef048535b6e9dae159c0"),
}

assert package.is_dir()
assert {path.name for path in package.iterdir() if path.is_file()} == set(expected_files)

for name, (size, sha256) in expected_files.items():
    data = (package / name).read_bytes()
    assert len(data) == size
    assert hashlib.sha256(data).hexdigest() == sha256

assert version() == "2022.4.4"
assert [len(read_basis(num_strands=n)) for n in (1, 2, 3, 4)] == [1, 3, 24, 648]

dim, reps, reps_inv = read_irr((2, 3, 5, 7), num_strands=3)
assert dim == [1, 1, 1, 2, 2, 2, 3]
assert len(reps) == 7
assert len(reps_inv) == 7
assert [len(matrix) for matrix in reps[0]] == [1, 1]
assert [len(matrix) for matrix in reps_inv[0]] == [1, 1]

reg_dim, reg_reps, reg_reps_inv = read_reg((2, 3, 5), num_strands=4)
assert reg_dim == [648]
assert [len(matrix) for matrix in reg_reps[0]] == [1080, 1701, 7862]
assert [len(matrix) for matrix in reg_reps_inv[0]] == [1080, 1728, 9370]

markov_u2 = read_markov("U2", (3, 5, 7, 11), num_strands=3)
assert len(markov_u2) == 24
assert markov_u2[:6] == [0, 11, 1 / 11, 11, 1 / 11, 0]

print("cubic-hecke-ok version=%s basis4=%s reg4=%s" % (version(), len(read_basis()), reg_dim[0]))
