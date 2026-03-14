/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Crear el contexto
const CategoryContext = createContext();

// Hook personalizado para usar el contexto más fácilmente
export const useCategories = () => useContext(CategoryContext);

export const CategoryProvider = ({ children }) => {
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCategories = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('created_at', { ascending: true }); // Orden de creación original

    if (error) {
      console.error("Error cargando categorías dinámicas:", error);
    } else if (data) {
      setCategories(data);
    }
    setIsLoading(false);
  };

  // Cargar las categorías de la base de datos al inicio
  useEffect(() => {
    fetchCategories();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const addCategory = async (name, color, bgColor) => {
    const { data, error } = await supabase
      .from('categories')
      .insert([{ name, color, bg_color: bgColor }])
      .select();

    if (error) throw error;
    if (data) setCategories([...categories, data[0]]);
    return data;
  };

  const deleteCategory = async (id) => {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) throw error;
    setCategories(categories.filter(c => c.id !== id));
  };

  // El contexto expone las categorias, si estan cargando, y las funciones para forzar la recarga/agregar/borrar
  return (
    <CategoryContext.Provider value={{ categories, isLoading, fetchCategories, addCategory, deleteCategory }}>
      {children}
    </CategoryContext.Provider>
  );
};
