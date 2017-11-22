// @flow

export type GuruDefinition = {
  objpos: string,
  desc: string
}

// TODO replace with atom type
type Pos = {
  row: number,
  column: number
}

export type DefLocation = {
  filepath: string,
  pos: Pos,
  raw?: string
}
