import { useState } from "react";
import {
  MembershipProver,
  MembershipVerifier,
  Tree,
  Poseidon,
  defaultAddressMembershipPConfig,
  defaultPubkeyMembershipPConfig,
  defaultPubkeyMembershipVConfig,
  defaultAddressMembershipVConfig,
  PublicInput,
} from "@personaelabs/spartan-ecdsa";
import {
  ecrecover,
  ecsign,
  hashPersonalMessage,
  privateToAddress,
  privateToPublic,
  pubToAddress,
} from "@ethereumjs/util";

type proofResultType = {
  proof: Uint8Array;
  publicInput: PublicInput;
};

export default function Home() {
  const [message, setMessage] = useState<string>("");
  const [group, setGroup] = useState<string[]>([]);
  const [member, setMember] = useState<string>("");
  const [proofResult, setProofResult] = useState<proofResultType>();
  const [processType, setProcesType] = useState<string>("not yet");

  //ex. ["🕵️", "🥷", "👩‍🔬"] for group
  const provePubKeyMembership = async () => {
    const privKey = Buffer.from("".padStart(16, "🧙"), "utf16le");
    // console.log(privKey) :  Uint8Array(32)
    const msg = Buffer.from("harry potter");
    //console.log(msg) : Uint8Array(12)
    const msgHash = hashPersonalMessage(msg);

    const { v, r, s } = ecsign(msgHash, privKey);
    console.log(v, r, s);
    // 27n, Uint8Array(32), Uint8Array(32) , ESDSA Sign
    const pubKey = ecrecover(msgHash, v, r, s);
    const sig = `0x${r.toString("hex")}${s.toString("hex")}${v.toString(16)}`;

    //pubKey and signiture -- later get from metamask

    const poseidon = new Poseidon();
    await poseidon.initWasm();

    const treeDepth = 20;
    const pubKeyTree = new Tree(treeDepth, poseidon);

    const proverPubKeyHash = poseidon.hashPubKey(pubKey);

    pubKeyTree.insert(proverPubKeyHash);

    // Insert other members into the tree -- should get other member's pubkey before if product
    for (const member of group) {
      const pubKey = privateToPublic(
        Buffer.from("".padStart(16, member), "utf16le")
      );
      //pubkey
      pubKeyTree.insert(poseidon.hashPubKey(pubKey));
    }

    const index = pubKeyTree.indexOf(proverPubKeyHash);
    const merkleProof = pubKeyTree.createProof(index);

    console.log("Proving...");
    setMessage("Proving...");
    console.time("Full proving time");

    const prover = new MembershipProver({
      ...defaultPubkeyMembershipPConfig,
      enableProfiler: true,
    });

    await prover.initWasm();

    const { proof, publicInput } = await prover.prove(
      sig,
      msgHash,
      merkleProof
    );

    setProofResult({
      proof,
      publicInput,
    });
    setProcesType("provePubKeyMembership");

    console.timeEnd("Full proving time");
    const consoleMsg =
      "Raw proof size (excluding public input)" + proof.length + "bytes";
    console.log(consoleMsg);
    setMessage(consoleMsg);
  };

  const proverPubKeyMembershipVerify = async () => {
    console.log("Verifying...");
    const verifier = new MembershipVerifier({
      ...defaultPubkeyMembershipVConfig,
      enableProfiler: true,
    });
    await verifier.initWasm();

    console.time("Verification time");
    const result = await verifier.verify(
      proofResult.proof,
      proofResult.publicInput.serialize()
    );
    console.timeEnd("Verification time");

    if (result) {
      console.log("Successfully verified proof!");
      setMessage("Successfully verified proof!");
    } else {
      console.log("Failed to verify proof :(");
    }
  };

  const proverAddressMembership = async () => {
    const privKey = Buffer.from("".padStart(16, "🧙"), "utf16le");
    const msg = Buffer.from("harry potter");
    const msgHash = hashPersonalMessage(msg);

    const { v, r, s } = ecsign(msgHash, privKey);
    const sig = `0x${r.toString("hex")}${s.toString("hex")}${v.toString(16)}`;

    const poseidon = new Poseidon();
    await poseidon.initWasm();

    const treeDepth = 20;
    const addressTree = new Tree(treeDepth, poseidon);

    const proverAddress = BigInt(
      "0x" + privateToAddress(privKey).toString("hex")
    );
    addressTree.insert(proverAddress);

    // Insert other members into the tree
    for (const member of group) {
      const pubKey = privateToPublic(
        Buffer.from("".padStart(16, member), "utf16le")
      );
      const address = BigInt("0x" + pubToAddress(pubKey).toString("hex"));
      addressTree.insert(address);
    }

    const index = addressTree.indexOf(proverAddress);
    const merkleProof = addressTree.createProof(index);

    console.log("Proving...");
    setMessage("Proving...");
    console.time("Full proving time");

    const prover = new MembershipProver({
      ...defaultAddressMembershipPConfig,
      enableProfiler: true,
    });

    await prover.initWasm();

    const { proof, publicInput } = await prover.prove(
      sig,
      msgHash,
      merkleProof
    );

    setProofResult({
      proof,
      publicInput,
    });

    setProcesType("proverAddressMembership");

    console.timeEnd("Full proving time");
    const proofMessage =
      "Raw proof size (excluding public input)" + proof.length + "bytes";
    console.log(proofMessage);
    setMessage(proofMessage);
  };

  const proverAddressMembershipVerify = async () => {
    //verify step
    console.log("Verifying...");
    setMessage("Verifying...");
    const verifier = new MembershipVerifier({
      ...defaultAddressMembershipVConfig,
      enableProfiler: true,
    });
    await verifier.initWasm();

    console.time("Verification time");
    const result = await verifier.verify(
      proofResult.proof,
      proofResult.publicInput.serialize()
    );
    console.timeEnd("Verification time");

    if (result) {
      console.log("Successfully verified proof!");
      setMessage("Successfully verified proof!");
    } else {
      console.log("Failed to verify proof :(");
    }
  };

  const handleGroup = () => {
    const copy = group;
    copy.push(member);
    setGroup(copy);
    setMember("");
  };

  const onChange = (e: any) => {
    const value = e.target.value;
    setMember(value);
  };

  return (
    <div>
      <h1>{processType}</h1>
      <h2>Spartan ECDSA</h2>
      <p>{message}</p>
      <div>
        <h3>Set up group</h3>
        <h3>
          group :{" "}
          {group.map((member) => (
            <div>{member}</div>
          ))}
        </h3>
        <input type="text" value={member} onChange={onChange} />
        <button onClick={handleGroup}>submit</button>
      </div>
      <div>
        <h3>Prove Public Key Membership</h3>
        <button onClick={provePubKeyMembership}>Prove</button>
        <button onClick={proverPubKeyMembershipVerify}>Verify</button>
      </div>

      <div>
        <h3> Prove Address Membership</h3>
        <button onClick={proverAddressMembership}>Prove</button>
        <button onClick={proverAddressMembershipVerify}>Verify</button>
      </div>
    </div>
  );
}
