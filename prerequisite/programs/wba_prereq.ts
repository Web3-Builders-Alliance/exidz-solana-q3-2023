import { IdlError } from "@project-serum/anchor";
import { IdlAccount, IdlAccountDef, IdlErrorCode, IdlInstruction } from "@project-serum/anchor/dist/cjs/idl";

export type WbaPrereq = {
  version: "0.1.0";
  name: "wba_prereq";
  instructions: IdlInstruction[];
  accounts: IdlAccountDef[];
  errors: IdlErrorCode[];
};
export const IDL: WbaPrereq = {
  version: "0.1.0",
  name: "wba_prereq",
  instructions: [
    {
      name: "complete",
      accounts: [
        {
          name: "signer",
          isMut: true,
          isSigner: true,
        },
        {
          name: "prereq",
          isMut: true,
          isSigner: false,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "github",
          type: "bytes",
        },
      ],
    },
    {
      name: "update",
      accounts: [
        {
          name: "signer",
          isMut: true,
          isSigner: true,
        },
        {
          name: "prereq",
          isMut: true,
          isSigner: false,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "github",
          type: "bytes",
        },
      ],
    },
  ],
  accounts: [
    {
      name: "PrereqAccount",
      type: {
        kind: "struct",
        fields: [
          {
            name: "github",
            type: "bytes",
          },
          {
            name: "key",
            type: "publicKey",
          },
        ],
      },
    },
  ],
  errors: [
    {
      code: 6000,
      name: "InvalidGithubAccount",
      msg: "Invalid Github account",
    },
  ],
};