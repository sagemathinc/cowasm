# include("fib.jl")
# @time bench(35)

function fib(n::Int)
    n<0 && error("n must be non negative")
    n<=1 && return 1
    fib(n-1) + fib(n-2)
end

function bench(n::Int)
    k = fib(n)
    println("fib", n, "=", k)
end