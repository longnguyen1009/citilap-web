/** Keep Prisma relation IN queries below D1's 100 bound-parameter limit. */
export async function catalogBatches<T>(read:(skip:number,take:number)=>Promise<T[]>):Promise<T[]> {
  const rows:T[]=[];
  for(let skip=0;;skip+=80) {
    const batch=await read(skip,80);
    rows.push(...batch);
    if(batch.length<80) return rows;
  }
}
