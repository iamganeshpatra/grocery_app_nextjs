"use client";

type Props = {
  onSearch: (val: string) => void;
};

const SearchBox = ({ onSearch }: Props) => {
  return (
    <div className="flex items-center bg-gray-100 px-3 py-2 rounded-lg w-full max-w-md">
      <input
        type="text"
        placeholder="Search products..."
        onChange={(e) => onSearch(e.target.value)}
        className="bg-transparent outline-none px-2 w-full"
      />
    </div>
  );
};

export default SearchBox;