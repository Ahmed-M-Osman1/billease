-- BillEase Initial Schema

-- Profiles (extends Supabase auth.users)
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  avatar_url  TEXT,
  currency    TEXT DEFAULT 'EGP',
  theme       TEXT DEFAULT 'system',
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Friends
CREATE TABLE friends (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  friend_id   UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  nickname    TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

-- Groups
CREATE TABLE groups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Group Members
CREATE TABLE group_members (
  group_id    UUID REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  profile_id  UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (group_id, profile_id)
);

-- Bills
CREATE TABLE bills (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title           TEXT NOT NULL,
  image_url       TEXT,
  date            DATE DEFAULT CURRENT_DATE,
  currency        TEXT DEFAULT 'EGP',
  subtotal        DECIMAL(10,2) DEFAULT 0,
  vat             DECIMAL(10,2) DEFAULT 0,
  service_charge  DECIMAL(10,2) DEFAULT 0,
  delivery        DECIMAL(10,2) DEFAULT 0,
  tip             DECIMAL(10,2) DEFAULT 0,
  tip_mode        TEXT DEFAULT 'none',
  status          TEXT DEFAULT 'draft',
  share_token     TEXT UNIQUE,
  is_collaborative BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Bill Participants
CREATE TABLE bill_participants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id     UUID REFERENCES bills(id) ON DELETE CASCADE NOT NULL,
  profile_id  UUID REFERENCES profiles(id),
  name        TEXT NOT NULL,
  color       TEXT,
  is_settled  BOOLEAN DEFAULT false,
  settled_at  TIMESTAMPTZ
);

-- Bill Split Groups
CREATE TABLE bill_split_groups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id     UUID REFERENCES bills(id) ON DELETE CASCADE NOT NULL,
  name        TEXT NOT NULL
);

-- Bill Split Group Members
CREATE TABLE bill_split_group_members (
  group_id        UUID REFERENCES bill_split_groups(id) ON DELETE CASCADE NOT NULL,
  participant_id  UUID REFERENCES bill_participants(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (group_id, participant_id)
);

-- Bill Items
CREATE TABLE bill_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id         UUID REFERENCES bills(id) ON DELETE CASCADE NOT NULL,
  name            TEXT NOT NULL,
  price           DECIMAL(10,2) NOT NULL,
  quantity        INTEGER DEFAULT 1,
  assigned_to     UUID REFERENCES bill_participants(id),
  assignment_type TEXT DEFAULT 'individual',
  shared_group_id UUID REFERENCES bill_split_groups(id)
);

-- Settlements
CREATE TABLE settlements (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id     UUID REFERENCES bills(id) ON DELETE CASCADE NOT NULL,
  from_id     UUID REFERENCES bill_participants(id) NOT NULL,
  to_id       UUID REFERENCES bill_participants(id) NOT NULL,
  amount      DECIMAL(10,2) NOT NULL,
  is_paid     BOOLEAN DEFAULT false,
  paid_at     TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_bills_user_id ON bills(user_id);
CREATE INDEX idx_bills_date ON bills(date DESC);
CREATE INDEX idx_bills_share_token ON bills(share_token);
CREATE INDEX idx_bill_items_bill_id ON bill_items(bill_id);
CREATE INDEX idx_bill_participants_bill_id ON bill_participants(bill_id);
CREATE INDEX idx_friends_user_id ON friends(user_id);
CREATE INDEX idx_settlements_bill_id ON settlements(bill_id);

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_split_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_split_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/update their own profile
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Friends: users can manage their own friends
CREATE POLICY "Users can view own friends" ON friends FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);
CREATE POLICY "Users can add friends" ON friends FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove friends" ON friends FOR DELETE USING (auth.uid() = user_id);

-- Groups: users can manage their own groups
CREATE POLICY "Users can view own groups" ON groups FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create groups" ON groups FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own groups" ON groups FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own groups" ON groups FOR DELETE USING (auth.uid() = user_id);

-- Group Members: via group ownership
CREATE POLICY "Users can view group members" ON group_members FOR SELECT
  USING (EXISTS (SELECT 1 FROM groups WHERE groups.id = group_id AND groups.user_id = auth.uid()));
CREATE POLICY "Users can manage group members" ON group_members FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM groups WHERE groups.id = group_id AND groups.user_id = auth.uid()));
CREATE POLICY "Users can remove group members" ON group_members FOR DELETE
  USING (EXISTS (SELECT 1 FROM groups WHERE groups.id = group_id AND groups.user_id = auth.uid()));

-- Bills: owner can CRUD, shared bills readable by anyone with token
CREATE POLICY "Users can view own bills" ON bills FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view shared bills" ON bills FOR SELECT USING (share_token IS NOT NULL);
CREATE POLICY "Users can create bills" ON bills FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own bills" ON bills FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own bills" ON bills FOR DELETE USING (auth.uid() = user_id);

-- Bill Participants: accessible via bill ownership or shared token
CREATE POLICY "Participants via bill owner" ON bill_participants FOR SELECT
  USING (EXISTS (SELECT 1 FROM bills WHERE bills.id = bill_id AND (bills.user_id = auth.uid() OR bills.share_token IS NOT NULL)));
CREATE POLICY "Owner can manage participants" ON bill_participants FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM bills WHERE bills.id = bill_id AND bills.user_id = auth.uid()));
CREATE POLICY "Owner can update participants" ON bill_participants FOR UPDATE
  USING (EXISTS (SELECT 1 FROM bills WHERE bills.id = bill_id AND bills.user_id = auth.uid()));
CREATE POLICY "Owner can delete participants" ON bill_participants FOR DELETE
  USING (EXISTS (SELECT 1 FROM bills WHERE bills.id = bill_id AND bills.user_id = auth.uid()));

-- Bill Items: same as participants
CREATE POLICY "Items via bill owner" ON bill_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM bills WHERE bills.id = bill_id AND (bills.user_id = auth.uid() OR bills.share_token IS NOT NULL)));
CREATE POLICY "Owner can manage items" ON bill_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM bills WHERE bills.id = bill_id AND bills.user_id = auth.uid()));
CREATE POLICY "Owner can update items" ON bill_items FOR UPDATE
  USING (EXISTS (SELECT 1 FROM bills WHERE bills.id = bill_id AND bills.user_id = auth.uid()));
CREATE POLICY "Owner can delete items" ON bill_items FOR DELETE
  USING (EXISTS (SELECT 1 FROM bills WHERE bills.id = bill_id AND bills.user_id = auth.uid()));

-- Bill Split Groups: via bill ownership
CREATE POLICY "Split groups via bill owner" ON bill_split_groups FOR SELECT
  USING (EXISTS (SELECT 1 FROM bills WHERE bills.id = bill_id AND (bills.user_id = auth.uid() OR bills.share_token IS NOT NULL)));
CREATE POLICY "Owner can manage split groups" ON bill_split_groups FOR ALL
  USING (EXISTS (SELECT 1 FROM bills WHERE bills.id = bill_id AND bills.user_id = auth.uid()));

-- Bill Split Group Members: via bill ownership
CREATE POLICY "Split group members via bill owner" ON bill_split_group_members FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM bill_split_groups bsg
    JOIN bills b ON b.id = bsg.bill_id
    WHERE bsg.id = group_id AND (b.user_id = auth.uid() OR b.share_token IS NOT NULL)
  ));
CREATE POLICY "Owner can manage split group members" ON bill_split_group_members FOR ALL
  USING (EXISTS (
    SELECT 1 FROM bill_split_groups bsg
    JOIN bills b ON b.id = bsg.bill_id
    WHERE bsg.id = group_id AND b.user_id = auth.uid()
  ));

-- Settlements: via bill ownership
CREATE POLICY "Settlements via bill owner" ON settlements FOR SELECT
  USING (EXISTS (SELECT 1 FROM bills WHERE bills.id = bill_id AND (bills.user_id = auth.uid() OR bills.share_token IS NOT NULL)));
CREATE POLICY "Owner can manage settlements" ON settlements FOR ALL
  USING (EXISTS (SELECT 1 FROM bills WHERE bills.id = bill_id AND bills.user_id = auth.uid()));

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER bills_updated_at BEFORE UPDATE ON bills
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Storage bucket for bill images
INSERT INTO storage.buckets (id, name, public) VALUES ('bill-images', 'bill-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload bill images" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'bill-images' AND auth.role() = 'authenticated');
CREATE POLICY "Anyone can view bill images" ON storage.objects FOR SELECT
  USING (bucket_id = 'bill-images');
CREATE POLICY "Users can delete own bill images" ON storage.objects FOR DELETE
  USING (bucket_id = 'bill-images' AND auth.uid()::text = (storage.foldername(name))[1]);
