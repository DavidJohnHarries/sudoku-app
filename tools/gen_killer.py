# Generates a killer sudoku with a unique solution (random cage partition, checked by a solver).
import random, sys, itertools
random.seed(int(sys.argv[1]) if len(sys.argv)>1 else 7)
def solved():
    base=[[ (3*(r%3)+r//3+c)%9+1 for c in range(9)] for r in range(9)]
    rows=[g*3+r for g in random.sample(range(3),3) for r in random.sample(range(3),3)]
    cols=[g*3+c for g in random.sample(range(3),3) for c in random.sample(range(3),3)]
    perm=random.sample(range(1,10),9)
    return [perm[base[r][c]-1] for r in rows for c in cols]
def nb(i):
    r,c=divmod(i,9);return [r*9+c+d for d in (-1,1) if 0<=c+d<9]+[(r+d)*9+c for d in (-1,1) if 0<=r+d<9]
def partition(sol):
    left=set(range(81));cages=[]
    while left:
        s=random.choice(sorted(left));cage=[s];left.discard(s);size=random.choice([2,2,3,3,3,4,4,5])
        while len(cage)<size:
            opts=[n for x in cage for n in nb(x) if n in left and sol[n] not in [sol[y] for y in cage]]
            if not opts:break
            n=random.choice(opts);cage.append(n);left.discard(n)
        cages.append(cage)
    return cages
def count(cages,limit=2):
    cageof=[0]*81
    for k,cg in enumerate(cages):
        for i in cg:cageof[i]=k
    sums=[0]*len(cages);tgt=[0]*len(cages);
    g=[0]*81;peers=[set() for _ in range(81)]
    for i in range(81):
        r,c=divmod(i,9)
        for j in range(81):
            if j!=i:
                r2,c2=divmod(j,9)
                if r==r2 or c==c2 or (r//3==r2//3 and c//3==c2//3) or cageof[i]==cageof[j]:peers[i].add(j)
    return cageof,peers
def solve(cages,tg,limit=2):
    cageof,peers=count(cages)
    g=[0]*81;filled=[0]*len(cages);s=[0]*len(cages);n=[len(c) for c in cages];res=[0]
    def cands(i):
        used={g[j] for j in peers[i]};k=cageof[i];rem=tg[k]-s[k];left=n[k]-filled[k]
        out=[]
        for d in range(1,10):
            if d in used:continue
            if left==1 and d!=rem:continue
            if left>1:
                r=rem-d;m=left-1
                if r< m*(m+1)//2 or r> sum(range(10-m,10)):continue
            out.append(d)
        return out
    def rec():
        if res[0]>=limit:return
        best=None;bc=None
        for i in range(81):
            if not g[i]:
                cs=cands(i)
                if best is None or len(cs)<len(bc):
                    best,bc=i,cs
                    if len(cs)<=1:break
        if best is None:res[0]+=1;return
        for d in bc:
            k=cageof[best];g[best]=d;s[k]+=d;filled[k]+=1
            rec()
            g[best]=0;s[k]-=d;filled[k]-=1
    rec();return res[0]
for attempt in range(200):
    sol=solved();cages=partition(sol);tg=[sum(sol[i] for i in c) for c in cages]
    if solve(cages,tg)==1:
        print("SUDOKU v1");print("name Sample killer");print("givens "+"."*81)
        for c,t in sorted(zip(cages,tg),key=lambda x:min(x[0])):
            print("cage %d "%t+" ".join("r%dc%d"%(i//9+1,i%9+1) for i in sorted(c)))
        print("# solution "+"".join(map(str,sol)),file=sys.stderr);break
