# frozen_string_literal: true

# Liquid 4 still calls these APIs, which Ruby 4 removed.
unless "".respond_to?(:tainted?)
  class Object
    def tainted?
      false
    end
  end
end

unless "".respond_to?(:untaint)
  class Object
    def untaint
      self
    end
  end
end
