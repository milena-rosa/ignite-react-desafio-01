import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storedCart = localStorage.getItem("@RocketShoes:cart");

    if (storedCart) {
      return JSON.parse(storedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const stockResponse = await api.get(`stock/${productId}`);
      if (stockResponse.status !== 200) {
        throw new Error("Erro na adição do produto");
      }
      const productStockAmount = (stockResponse.data as Stock).amount;

      const newCart = [...cart];
      const foundProduct = newCart.find((product) => product.id === productId);
      const currentAmount = foundProduct ? foundProduct.amount : 0;
      const amount = currentAmount + 1;

      if (amount > productStockAmount || productStockAmount < 1) {
        throw new Error("Quantidade solicitada fora de estoque");
      }

      // produto nunca adicionado ao carrinho.
      if (!foundProduct) {
        const productResponse = await api.get(`products/${productId}`);
        if (productResponse.status !== 200) {
          throw new Error("Erro na adição do produto");
        }
        newCart.push({
          ...productResponse.data,
          amount,
        });
      } else {
        foundProduct.amount = amount;
      }

      setCart(newCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
    } catch (err: any) {
      if (err.message.startsWith("Request failed")) {
        toast.error("Erro na adição do produto");
      }
      toast.error(err.message);
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const newCart = Array.from(cart);
      const foundProductIndex = cart.findIndex((product) => product.id === productId);
      if (foundProductIndex === -1) {
        throw new Error();
      }

      if (newCart[foundProductIndex].amount === 1) {
        newCart.splice(foundProductIndex, 1);
      } else {
        newCart[foundProductIndex].amount = newCart[foundProductIndex].amount - 1;
      }

      setCart(newCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({ productId, amount }: UpdateProductAmount) => {
    try {
      if (amount < 1) {
        throw new Error("Erro na alteração de quantidade do produto");
      }

      const newCart = Array.from(cart);
      const productIndex = newCart.findIndex((product) => product.id === productId);
      if (productIndex === -1) {
        throw new Error("Erro na alteração de quantidade do produto");
      }

      const stockApiResponse = await api.get(`stock/${productId}`);
      if (!stockApiResponse.data) {
        throw new Error("Erro na alteração de quantidade do produto");
      }
      const productStockAmount = (stockApiResponse.data as Stock).amount;

      if (productStockAmount - amount < 0) {
        throw new Error("Quantidade solicitada fora de estoque");
      }

      newCart[productIndex].amount = amount;

      setCart(newCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(cart));
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <CartContext.Provider value={{ cart, addProduct, removeProduct, updateProductAmount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
